"""
===============================================================================
D³AS — Distributed Dataset Duplication & Delta Access System
Single-File Reference & Architecture Prototype Implementation
===============================================================================

Authors: D³AS Core Engineering Team
Target Architecture: Institutional Scientific Data Mesh & Interception Engine
Standard Library Dependencies: dataclasses, hashlib, datetime, typing, json,
                               math, time, collections, enum
===============================================================================
"""

from dataclasses import dataclass, field
from datetime import datetime, date
from enum import Enum
import hashlib
import json
import math
import time
from typing import List, Dict, Tuple, Optional, Set, Any
from collections import defaultdict


# =============================================================================
# 1. DATA MODELS & ENUMERATIONS
# =============================================================================

class AccessLevel(str, Enum):
    PUBLIC = "public"
    INTERNAL = "internal"
    RESTRICTED = "restricted"


class MatchClassification(str, Enum):
    EXACT_BYTE_DUPLICATE = "EXACT_BYTE_DUPLICATE"
    LOGICAL_DUPLICATE = "LOGICAL_DUPLICATE"
    PARTIAL_DUPLICATE = "PARTIAL_DUPLICATE"
    ALTERNATE_VERSION = "ALTERNATE_VERSION"
    RELATED_DATASET = "RELATED_DATASET"
    NO_MATCH = "NO_MATCH"


class RecommendedAction(str, Enum):
    USE_EXISTING = "USE_EXISTING"
    DOWNLOAD_DELTA = "DOWNLOAD_DELTA"
    REQUEST_ACCESS = "REQUEST_ACCESS"
    WAIT_AND_REUSE = "WAIT_AND_REUSE"
    DOWNLOAD_ANYWAY = "DOWNLOAD_ANYWAY"


@dataclass
class User:
    """Represents a researcher initiating dataset access or downloads."""
    id: str
    name: str
    department: str
    clearance_level: AccessLevel = AccessLevel.INTERNAL


@dataclass
class Chunk:
    """A content-defined slice of data identified by rolling-hash boundary."""
    offset: int
    length: int
    sha256: str


@dataclass
class Dataset:
    """
    Core metadata representation of a stored scientific dataset across
    the institutional data mesh.
    """
    id: str
    display_name: str
    owner: str
    repository_node: str               # e.g., 'Node A — Climate Lab'
    access_level: AccessLevel

    provider: str                      # e.g., 'ECMWF', 'ISRO', 'NASA'
    source_url: str
    dataset_identifier: str            # e.g., 'ERA5_REANALYSIS_HOURLY'

    variable: str                      # e.g., 'precipitation', 'sst', 'sar_reflectance'

    # Spatial Bounding Box: [min_lon, min_lat, max_lon, max_lat]
    bbox: List[float]

    time_start: date
    time_end: date

    spatial_resolution: float          # in degrees, e.g., 0.25 deg (~28 km)
    temporal_resolution: str           # e.g., '1-hour', 'daily', 'monthly'

    format: str                        # e.g., 'NetCDF4', 'GeoTIFF', 'Zarr'
    version: str                       # e.g., 'v1.2'

    size_gb: float
    sha256: str                        # Full dataset SHA-256 fingerprint
    chunks: List[Chunk] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DownloadRequest:
    """
    Represents an incoming intent to download a dataset from an external
    or remote provider before bytes are transferred over the network.
    """
    request_id: str
    user_id: str
    target_url: str
    intended_filename: str

    provider: str
    dataset_identifier: str
    variable: str

    bbox: List[float]
    time_start: date
    time_end: date

    spatial_resolution: float
    temporal_resolution: str
    format: str
    version: str = "v1.0"

    expected_size_gb: float = 0.0
    known_sha256: Optional[str] = None
    sample_payload_bytes: Optional[bytes] = None


@dataclass
class MatchSignals:
    """Decomposed, explainable similarity signals between query and candidate."""
    exact_hash_match: bool = False
    source_identity_match: float = 0.0
    content_similarity: float = 0.0       # CDC Jaccard score
    request_containment: float = 0.0      # CDC containment score
    temporal_coverage: float = 0.0        # Fraction of requested time covered
    spatial_coverage: float = 0.0         # Fraction of requested bbox covered
    metadata_similarity: float = 0.0      # Weighted attribute compatibility
    overall_confidence: float = 0.0       # Composite explainable score [0..100%]


@dataclass
class MatchResult:
    """Synthesized detection result linking candidate and evaluation signals."""
    candidate: Dataset
    classification: MatchClassification
    signals: MatchSignals
    authorized: bool
    reusable_years: List[int] = field(default_factory=list)


@dataclass
class DeltaPlan:
    """Deterministic recipe for slicing local replicas vs fetching deltas."""
    is_applicable: bool
    reusable_datasets: List[Dataset] = field(default_factory=list)
    reusable_temporal_span: str = ""
    missing_temporal_span: str = ""
    reusable_gb: float = 0.0
    additional_download_gb: float = 0.0
    bandwidth_saved_percentage: float = 0.0
    source_supports_delta: bool = True
    execution_notes: str = ""


# =============================================================================
# 2. CORE MATHEMATICAL & HASHING ALGORITHMS
# =============================================================================

def compute_sha256(data: bytes) -> str:
    """
    Computes cryptographic SHA-256 digest over arbitrary binary data.
    Ensures byte-level determinism invariant to filenames or transport URLs.
    """
    return hashlib.sha256(data).hexdigest()


def content_defined_chunking(data: bytes, min_chunk=64, max_chunk=256, mask=0x1F) -> List[Chunk]:
    """
    Content-Defined Chunking (CDC) via simplified Rabin-style rolling hash.
    
    WHY CDC INSTEAD OF FIXED-SIZE CHUNKS?
    Fixed-size chunks suffer from the 'byte-shift problem' where inserting a single
    byte at the start invalidates all downstream chunk hashes. CDC uses rolling
    window boundaries so shifted or patched data preserves identical chunk hashes.
    """
    chunks = []
    n = len(data)
    if n == 0:
        return chunks

    offset = 0
    window = 16
    rolling = 0

    for i in range(n):
        byte = data[i]
        rolling = ((rolling << 1) + byte) & 0xFFFFFFFF

        current_len = i - offset + 1
        # Boundary trigger: rolling hash matches bitmask OR max chunk size reached
        if (current_len >= min_chunk and (rolling & mask) == 0) or current_len >= max_chunk or i == n - 1:
            chunk_slice = data[offset : i + 1]
            c_hash = compute_sha256(chunk_slice)
            chunks.append(Chunk(offset=offset, length=len(chunk_slice), sha256=c_hash))
            offset = i + 1
            rolling = 0

    return chunks


def jaccard_similarity(chunks_a: List[str], chunks_b: List[str]) -> float:
    """Jaccard index: Intersection / Union."""
    set_a, set_b = set(chunks_a), set(chunks_b)
    if not set_a or not set_b:
        return 0.0
    intersection = len(set_a & set_b)
    union = len(set_a | set_b)
    return intersection / union if union > 0 else 0.0


def request_containment(request_chunks: List[str], dataset_chunks: List[str]) -> float:
    """
    Request Containment: Intersection / Requested Chunks.
    
    WHY IS CONTAINMENT ESSENTIAL ALONGSIDE JACCARD?
    A 100 TB archival dataset containing a 10 GB requested subset will have a tiny
    Jaccard score (<1%), but 100% Request Containment. Containment proves the local
    data fully satisfies the user's specific request.
    """
    set_req, set_ds = set(request_chunks), set(dataset_chunks)
    if not set_req:
        return 0.0
    return len(set_req & set_ds) / len(set_req)


def temporal_overlap(start_a: date, end_a: date, start_b: date, end_b: date) -> float:
    """
    Calculates the temporal intersection fraction of Request A covered by Dataset B.
    Formula: (Intersection Days) / (Requested Total Days) in range [0.0, 1.0].
    """
    req_total_days = max(1, (end_a - start_a).days + 1)
    overlap_start = max(start_a, start_b)
    overlap_end = min(end_a, end_b)

    if overlap_start > overlap_end:
        return 0.0

    overlap_days = (overlap_end - overlap_start).days + 1
    return min(1.0, max(0.0, overlap_days / req_total_days))


def spatial_overlap(bbox_req: List[float], bbox_stored: List[float]) -> float:
    """
    Calculates spatial bounding box overlap fraction.
    bbox format: [min_lon, min_lat, max_lon, max_lat]
    
    Formula: Area(Intersection) / Area(Requested Domain).
    """
    r_min_x, r_min_y, r_max_x, r_max_y = bbox_req
    s_min_x, s_min_y, s_max_x, s_max_y = bbox_stored

    req_area = max(1e-6, (r_max_x - r_min_x) * (r_max_y - r_min_y))

    inter_min_x = max(r_min_x, s_min_x)
    inter_min_y = max(r_min_y, s_min_y)
    inter_max_x = min(r_max_x, s_max_x)
    inter_max_y = min(r_max_y, s_max_y)

    if inter_min_x >= inter_max_x or inter_min_y >= inter_max_y:
        return 0.0

    inter_area = (inter_max_x - inter_min_x) * (inter_max_y - inter_min_y)
    return min(1.0, max(0.0, inter_area / req_area))


def metadata_similarity(req: DownloadRequest, stored: Dataset) -> float:
    """
    Evaluates scientific metadata attribute compatibility.
    
    WHY ASYMMETRIC WEIGHTING?
    A variable mismatch (e.g., Temperature vs Ozone) is fatal (weight 0.40).
    A file format mismatch (NetCDF4 vs GeoTIFF) is minor (weight 0.10) because
    they represent equivalent scientific tensor information that can be transcoded.
    """
    score = 0.0

    # 1. Variable equality (Critical)
    if req.variable.strip().lower() == stored.variable.strip().lower():
        score += 0.40

    # 2. Provider and family match (High)
    if req.provider.strip().lower() == stored.provider.strip().lower():
        score += 0.20
    if req.dataset_identifier.strip().lower() == stored.dataset_identifier.strip().lower():
        score += 0.20

    # 3. Spatial resolution tolerance (within 20%)
    if stored.spatial_resolution > 0:
        res_ratio = min(req.spatial_resolution, stored.spatial_resolution) / max(req.spatial_resolution, stored.spatial_resolution)
        score += 0.10 * res_ratio

    # 4. Format compatibility (Informative)
    if req.format.strip().lower() == stored.format.strip().lower():
        score += 0.10
    else:
        # Cross-scientific format translation compatibility
        score += 0.05

    return round(min(1.0, score), 4)


# =============================================================================
# 3. CONSISTENT HASH RING & DISTRIBUTED INDEX
# =============================================================================

class ConsistentHashRing:
    """
    Maps dataset identity keys to responsible repository nodes across a circular
    keyspace [0..359 degrees].
    
    WHY CONSISTENT HASHING?
    Avoids a bottleneck single-point-of-failure catalog. Each node manages its
    assigned partitions. Node additions/removals only require rehashing K/N keys.
    """
    def __init__(self, node_positions: Dict[str, int]):
        # Positions: e.g. {"Node A": 30, "Node B": 150, "Node C": 270}
        self.node_positions = sorted(node_positions.items(), key=lambda x: x[1])

    def hash_to_ring(self, key: str) -> int:
        """Hashes arbitrary string key to degree [0..359]."""
        md5_val = int(hashlib.md5(key.encode('utf-8')).hexdigest()[:8], 16)
        return md5_val % 360

    def responsible_node(self, key: str) -> Tuple[str, int, int]:
        """Returns (node_name, bucket_degree, node_position_degree)."""
        bucket = self.hash_to_ring(key)
        for name, pos in self.node_positions:
            if bucket <= pos:
                return name, bucket, pos
        # Wrap around to the first node
        return self.node_positions[0][0], bucket, self.node_positions[0][1]


class DistributedIndex:
    """
    Federated, distributed lookup index maintaining inverse mapping for fast
    O(1) pre-download candidate discovery across all cluster nodes.
    """
    def __init__(self, ring: ConsistentHashRing):
        self.ring = ring
        # SHA-256 -> Set of Dataset IDs
        self.sha_index: Dict[str, Set[str]] = defaultdict(set)
        # Chunk Hash -> Set of Dataset IDs
        self.chunk_index: Dict[str, Set[str]] = defaultdict(set)
        # Semantic Key (provider:variable) -> Set of Dataset IDs
        self.identity_index: Dict[str, Set[str]] = defaultdict(set)
        # Global Dataset lookup
        self.datasets: Dict[str, Dataset] = {}

    def register(self, dataset: Dataset):
        """Indexes a dataset published by a Repository Agent."""
        self.datasets[dataset.id] = dataset
        self.sha_index[dataset.sha256].add(dataset.id)

        for chunk in dataset.chunks:
            self.chunk_index[chunk.sha256].add(dataset.id)

        semantic_key = f"{dataset.provider}:{dataset.variable}".lower()
        self.identity_index[semantic_key].add(dataset.id)

    def lookup_candidates(self, preflight_key: str, semantic_key: str, sha256_candidate: Optional[str]) -> Tuple[List[Dataset], str]:
        """
        Routes the query key to responsible node via hash ring and retrieves
        matching candidate dataset references.
        """
        node_name, bucket, node_pos = self.ring.responsible_node(semantic_key)
        trace = f"Gateway → Hash Bucket {bucket}° → Routed to {node_name} (partition @ {node_pos}°)"

        candidate_ids = set()
        if sha256_candidate and sha256_candidate in self.sha_index:
            candidate_ids.update(self.sha_index[sha256_candidate])

        if semantic_key in self.identity_index:
            candidate_ids.update(self.identity_index[semantic_key])

        candidates = [self.datasets[did] for did in candidate_ids if did in self.datasets]
        return candidates, trace


# =============================================================================
# 4. REPOSITORY NODES & AGENTS
# =============================================================================

class RepositoryNode:
    """Logical storage cluster holding physical datasets."""
    def __init__(self, name: str, lab: str):
        self.name = name
        self.lab = lab
        self.storage: Dict[str, Dataset] = {}

    def add_dataset(self, dataset: Dataset):
        self.storage[dataset.id] = dataset


class RepositoryAgent:
    """
    Autonomous node-level agent. Scans local storage, computes CDC fingerprints,
    and publishes index descriptors to the distributed index WITHOUT transferring
    raw payload bytes.
    """
    def __init__(self, node: RepositoryNode, distributed_index: DistributedIndex):
        self.node = node
        self.index = distributed_index

    def publish_dataset(self, dataset: Dataset):
        # 1. Store dataset in local repository node
        self.node.add_dataset(dataset)
        # 2. Publish searchable descriptors into institutional data mesh
        self.index.register(dataset)


# =============================================================================
# 5. IN-FLIGHT DOWNLOAD REGISTRY (CONCURRENCY CONTROL)
# =============================================================================

@dataclass
class InFlightDownload:
    request_id: str
    user_name: str
    dataset_identifier: str
    started_at: datetime
    progress_percentage: int = 42


class DownloadRegistry:
    """
    Tracks active transfers to intercept redundant concurrent downloads in real time.
    """
    def __init__(self):
        self._active_transfers: Dict[str, InFlightDownload] = {}

    def register_start(self, dataset_key: str, user_name: str, req_id: str):
        self._active_transfers[dataset_key] = InFlightDownload(
            request_id=req_id,
            user_name=user_name,
            dataset_identifier=dataset_key,
            started_at=datetime.now(),
            progress_percentage=45
        )

    def check_in_flight(self, dataset_key: str) -> Optional[InFlightDownload]:
        return self._active_transfers.get(dataset_key)


# =============================================================================
# 6. RBAC & PRIVACY FIREWALL
# =============================================================================

def authorize(user: User, dataset: Dataset) -> Tuple[bool, Optional[Dataset]]:
    """
    Applies zero-leakage role-based access control.
    
    WHY MASK RESTRICTED METADATA?
    Disclosing dataset paths, owners, or exact file headers of restricted
    defense/medical datasets constitutes an information side-channel leak.
    """
    if dataset.access_level == AccessLevel.PUBLIC:
        return True, dataset

    if dataset.access_level == AccessLevel.INTERNAL and user.clearance_level in [AccessLevel.INTERNAL, AccessLevel.RESTRICTED]:
        return True, dataset

    if dataset.access_level == AccessLevel.RESTRICTED and user.clearance_level == AccessLevel.RESTRICTED:
        return True, dataset

    # Access Denied: Return sanitized, masked stub
    masked_dataset = Dataset(
        id=dataset.id,
        display_name="[Restricted Research Asset]",
        owner="[Protected Entity]",
        repository_node="[Restricted Node]",
        access_level=dataset.access_level,
        provider=dataset.provider,
        source_url="[Hidden]",
        dataset_identifier=dataset.dataset_identifier,
        variable=dataset.variable,
        bbox=dataset.bbox,
        time_start=dataset.time_start,
        time_end=dataset.time_end,
        spatial_resolution=dataset.spatial_resolution,
        temporal_resolution=dataset.temporal_resolution,
        format=dataset.format,
        version=dataset.version,
        size_gb=dataset.size_gb,
        sha256="[Masked]"
    )
    return False, masked_dataset


# =============================================================================
# 7. DELTA ACCESS PLANNER
# =============================================================================

def is_delta_compatible(req: DownloadRequest, ds: Dataset) -> bool:
    """Verifies that datasets share identical physical variables and spatial coverage."""
    same_var = req.variable.strip().lower() == ds.variable.strip().lower()
    same_provider = req.provider.strip().lower() == ds.provider.strip().lower()
    res_compatible = abs(req.spatial_resolution - ds.spatial_resolution) < 0.05
    return same_var and same_provider and res_compatible


def create_delta_plan(request: DownloadRequest, candidates: List[Dataset], source_capabilities: Dict[str, bool]) -> DeltaPlan:
    """
    Synthesizes multiple localized dataset fragments to minimize external transfers.
    
    Example:
      Requested: India Rainfall 2020–2025 (6 years)
      Stored: Node A (2020–2023, 4 yrs) + Node B (2024, 1 yr)
      Output: 2020–2024 reusable (5 yrs), Download missing 2025 (1 yr) only.
    """
    compatible = [ds for ds in candidates if is_delta_compatible(request, ds)]
    if not compatible:
        return DeltaPlan(is_applicable=False)

    req_start_yr = request.time_start.year
    req_end_yr = request.time_end.year
    total_requested_years = set(range(req_start_yr, req_end_yr + 1))

    covered_years = set()
    participating_datasets = []

    for ds in compatible:
        ds_years = set(range(ds.time_start.year, ds.time_end.year + 1))
        intersect = ds_years & total_requested_years
        if intersect and not intersect.issubset(covered_years):
            covered_years.update(intersect)
            participating_datasets.append(ds)

    missing_years = sorted(list(total_requested_years - covered_years))
    reusable_years = sorted(list(covered_years))

    if not reusable_years or not missing_years:
        # Either fully covered (exact/logical) or none covered
        return DeltaPlan(is_applicable=False)

    coverage_fraction = len(reusable_years) / len(total_requested_years)
    total_size = request.expected_size_gb or 12.0
    reusable_gb = round(total_size * coverage_fraction, 2)
    additional_gb = round(total_size * (1.0 - coverage_fraction), 2)
    saving_pct = round(coverage_fraction * 100.0, 1)

    reusable_str = f"{min(reusable_years)}–{max(reusable_years)}" if len(reusable_years) > 1 else f"{reusable_years[0]}"
    missing_str = f"{min(missing_years)}–{max(missing_years)}" if len(missing_years) > 1 else f"{missing_years[0]}"

    supports_subsetting = source_capabilities.get("temporal_subset", True)

    notes = (
        f"Local institutional cluster satisfies {saving_pct}% of temporal span. "
        f"Fetch delta for {missing_str}." if supports_subsetting else
        f"Partial coverage found ({saving_pct}%), but remote provider requires full file download."
    )

    return DeltaPlan(
        is_applicable=True,
        reusable_datasets=participating_datasets,
        reusable_temporal_span=reusable_str,
        missing_temporal_span=missing_str,
        reusable_gb=reusable_gb,
        additional_download_gb=additional_gb,
        bandwidth_saved_percentage=saving_pct,
        source_supports_delta=supports_subsetting,
        execution_notes=notes
    )


# =============================================================================
# 8. AUDIT LOG & TELEMETRY METRICS
# =============================================================================

class SystemMetrics:
    def __init__(self):
        self.datasets_indexed = 0
        self.duplicate_requests_detected = 0
        self.downloads_prevented = 0
        self.bandwidth_saved_gb = 0.0
        self.delta_downloads_planned = 0
        self.access_requests_logged = 0

    def print_dashboard(self):
        print("\n" + "=" * 65)
        print("D³AS PLATFORM TELEMETRY & RESOURCE SUMMARY")
        print("=" * 65)
        print(f" Datasets Indexed across Mesh  : {self.datasets_indexed}")
        print(f" Duplicate Requests Intercepted : {self.duplicate_requests_detected}")
        print(f" Full Downloads Prevented       : {self.downloads_prevented}")
        print(f" Delta Transfers Optimized      : {self.delta_downloads_planned}")
        print(f" Access Requests Facilitated    : {self.access_requests_logged}")
        print(f" Total External Bandwidth Saved : {self.bandwidth_saved_gb:.2f} GB")
        print("=" * 65 + "\n")


AUDIT_RECORDS: List[Dict[str, Any]] = []
METRICS = SystemMetrics()


def audit_log(event_type: str, details: str, user_id: str, saved_gb: float = 0.0):
    entry = {
        "timestamp": datetime.now().strftime("%H:%M:%S.%f")[:12],
        "event": event_type,
        "details": details,
        "user": user_id,
        "saved_gb": saved_gb
    }
    AUDIT_RECORDS.append(entry)


# =============================================================================
# 9. TWO-STAGE PRE-DOWNLOAD ENGINE & CLASSIFIER
# =============================================================================

def preflight_check(request: DownloadRequest) -> str:
    """
    Stage A: Preflight Metadata Extraction.
    Extracts high-level signature before network payload transfer starts.
    """
    return f"{request.provider}:{request.variable}:{request.dataset_identifier}".lower()


def streaming_verification(incoming_bytes: bytes, distributed_index: DistributedIndex, threshold: float = 0.85) -> Tuple[bool, float, List[Chunk]]:
    """
    Stage B: Incremental Chunk Streaming Verification.
    Calculates CDC hashes on the fly as packets arrive. If matching chunks exceed
    threshold, early-aborts the download to save bandwidth.
    """
    # In production these hashes are calculated incrementally while bytes arrive from the source.
    chunks = content_defined_chunking(incoming_bytes)
    chunk_hashes = [c.sha256 for c in chunks]

    # Compare against index chunk mappings
    matched_counts = defaultdict(int)
    for ch in chunk_hashes:
        if ch in distributed_index.chunk_index:
            for ds_id in distributed_index.chunk_index[ch]:
                matched_counts[ds_id] += 1

    if not matched_counts:
        return False, 0.0, chunks

    best_match_id, count = max(matched_counts.items(), key=lambda x: x[1])
    containment = count / max(1, len(chunk_hashes))
    return (containment >= threshold), containment, chunks


def evaluate_signals(req: DownloadRequest, ds: Dataset, sample_chunks: Optional[List[Chunk]] = None) -> MatchSignals:
    """
    Computes explainable multi-signal breakdown across 5 orthogonal axes.
    """
    exact_hash = bool(req.known_sha256 and req.known_sha256 == ds.sha256)
    
    # 1. Source Identity Match
    src_match = 1.0 if (req.provider.lower() == ds.provider.lower() and req.dataset_identifier.lower() == ds.dataset_identifier.lower()) else 0.0
    
    # 2. Content similarity via CDC
    req_hashes = [c.sha256 for c in sample_chunks] if sample_chunks else []
    ds_hashes = [c.sha256 for c in ds.chunks]
    
    c_sim = jaccard_similarity(req_hashes, ds_hashes) if req_hashes else (1.0 if exact_hash else 0.0)
    containment = request_containment(req_hashes, ds_hashes) if req_hashes else (1.0 if exact_hash else 0.0)
    
    # 3. Temporal Coverage
    t_cov = temporal_overlap(req.time_start, req.time_end, ds.time_start, ds.time_end)
    
    # 4. Spatial Coverage
    s_cov = spatial_overlap(req.bbox, ds.bbox)
    
    # 5. Metadata Similarity
    m_sim = metadata_similarity(req, ds)

    # Hierarchical composite score calculation
    if exact_hash:
        confidence = 100.0
    else:
        # Weighted signal synthesis
        confidence = (
            (containment * 40.0) +
            (t_cov * 20.0) +
            (s_cov * 20.0) +
            (m_sim * 10.0) +
            (src_match * 10.0)
        )

    return MatchSignals(
        exact_hash_match=exact_hash,
        source_identity_match=src_match,
        content_similarity=round(c_sim, 4),
        request_containment=round(containment, 4),
        temporal_coverage=round(t_cov, 4),
        spatial_coverage=round(s_cov, 4),
        metadata_similarity=round(m_sim, 4),
        overall_confidence=round(confidence, 1)
    )


def classify_match(signals: MatchSignals) -> MatchClassification:
    """
    Hierarchical Classification Tree.
    Decoupled from raw score numbers to guarantee explainability.
    """
    if signals.exact_hash_match or signals.content_similarity >= 0.99 or signals.request_containment >= 0.99:
        return MatchClassification.EXACT_BYTE_DUPLICATE

    if signals.source_identity_match == 1.0 and signals.temporal_coverage >= 0.95 and signals.spatial_coverage >= 0.95 and signals.metadata_similarity >= 0.85:
        return MatchClassification.LOGICAL_DUPLICATE

    if (signals.temporal_coverage > 0.0 or signals.spatial_coverage > 0.0) and signals.metadata_similarity >= 0.70:
        return MatchClassification.PARTIAL_DUPLICATE

    if signals.metadata_similarity >= 0.65 and signals.source_identity_match == 1.0:
        return MatchClassification.ALTERNATE_VERSION

    if signals.metadata_similarity >= 0.50:
        return MatchClassification.RELATED_DATASET

    return MatchClassification.NO_MATCH


# =============================================================================
# 10. MAIN PRE-DOWNLOAD INTERCEPTION ENGINE
# =============================================================================

def process_download_request(
    request: DownloadRequest,
    user: User,
    distributed_index: DistributedIndex,
    download_registry: DownloadRegistry,
    source_capabilities: Optional[Dict[str, bool]] = None
) -> Dict[str, Any]:
    """
    ===========================================================================
    MAIN ENTRY POINT: D³AS Pre-Download Intelligence Pipeline
    ===========================================================================
    """
    if source_capabilities is None:
        source_capabilities = {"byte_range": True, "temporal_subset": True, "spatial_subset": False}

    print("\n" + "=" * 65)
    print(" D³AS — DATA DOWNLOAD DUPLICATION & DELTA ACCESS ENGINE")
    print("=" * 65)
    print(f" REQUEST ID   : {request.request_id}")
    print(f" RESEARCHER   : {user.name} ({user.department}) [Clearance: {user.clearance_level.value.upper()}]")
    print(f" INTENDED FILE: {request.intended_filename}")
    print(f" TARGET URL   : {request.target_url}")
    print(f" DATASET SPEC : {request.provider} / {request.dataset_identifier} ({request.variable})")
    print(f" SPATIAL EXT  : {request.bbox}")
    print(f" TEMPORAL SPAN: {request.time_start} → {request.time_end}")
    print("=" * 65)

    audit_log("REQUEST_RECEIVED", f"Request {request.request_id} for {request.intended_filename}", user.id)

    # -------------------------------------------------------------------------
    # STEP 1: CONCURRENT IN-FLIGHT TRANSFER CHECK
    # -------------------------------------------------------------------------
    dataset_key = f"{request.provider}:{request.dataset_identifier}:{request.variable}:{request.time_start.year}-{request.time_end.year}".lower()
    in_flight = download_registry.check_in_flight(dataset_key)

    if in_flight:
        print("\n [!] CONCURRENCY INTERCEPTION: Transfer already in progress by another user.")
        print(f"     Active Downloader: {in_flight.user_name}")
        print(f"     Current Progress : {in_flight.progress_percentage}% completed")
        print(f"     Action           : {RecommendedAction.WAIT_AND_REUSE.value}")
        audit_log("CONCURRENT_INTERCEPTION", f"Blocked redundant download. User {in_flight.user_name} downloading.", user.id)
        METRICS.downloads_prevented += 1
        METRICS.duplicate_requests_detected += 1
        METRICS.bandwidth_saved_gb += request.expected_size_gb
        return {"action": RecommendedAction.WAIT_AND_REUSE, "in_flight": in_flight}

    # -------------------------------------------------------------------------
    # STEP 2: STAGE A — PREFLIGHT METADATA IDENTITY EXTRACTION
    # -------------------------------------------------------------------------
    print("\n [1] PREFLIGHT INTELLIGENCE:")
    preflight_sig = preflight_check(request)
    semantic_key = f"{request.provider}:{request.variable}".lower()
    print(f"     Extracted Signature : {preflight_sig}")

    # -------------------------------------------------------------------------
    # STEP 3: ROUTE QUERY THROUGH DISTRIBUTED CONSISTENT HASH RING
    # -------------------------------------------------------------------------
    print("\n [2] DISTRIBUTED HASH RING ROUTING:")
    candidates, ring_trace = distributed_index.lookup_candidates(preflight_sig, semantic_key, request.known_sha256)
    print(f"     Trace               : {ring_trace}")
    print(f"     Candidate Datasets  : {len(candidates)} located across institutional nodes")

    for c in candidates:
        print(f"       → [{c.repository_node}] {c.display_name} ({c.id})")

    # -------------------------------------------------------------------------
    # STEP 4: STAGE B — STREAMING VERIFICATION (IF SAMPLES PRESENT)
    # -------------------------------------------------------------------------
    sample_chunks = None
    if request.sample_payload_bytes:
        print("\n [3] STREAMING CDC VERIFICATION:")
        should_abort, match_ratio, sample_chunks = streaming_verification(request.sample_payload_bytes, distributed_index)
        print(f"     CDC Chunks Analyzed : {len(sample_chunks)}")
        print(f"     Chunk Containment   : {match_ratio * 100:.1f}%")
        if should_abort:
            print("     Early Abort Signal  : Active transfer halted. Institutional replica confirmed.")

    # -------------------------------------------------------------------------
    # STEP 5: COMPUTE EXPLAINABLE MATCH SIGNALS & CLASSIFY
    # -------------------------------------------------------------------------
    print("\n [4] MULTI-SIGNAL DECOMPOSITION:")
    match_evaluations: List[MatchResult] = []

    for cand in candidates:
        signals = evaluate_signals(request, cand, sample_chunks)
        classification = classify_match(signals)
        is_auth, visible_cand = authorize(user, cand)

        match_evaluations.append(MatchResult(
            candidate=visible_cand,
            classification=classification,
            signals=signals,
            authorized=is_auth
        ))

        print(f"\n     Evaluation Candidate: {visible_cand.display_name} ({visible_cand.id})")
        print(f"     ├─ Classification   : {classification.value}")
        print(f"     ├─ Exact Hash Match : {'YES' if signals.exact_hash_match else 'NO'}")
        print(f"     ├─ Request Content  : {signals.request_containment * 100:.1f}% containment (Jaccard: {signals.content_similarity * 100:.1f}%)")
        print(f"     ├─ Temporal Coverage: {signals.temporal_coverage * 100:.1f}%")
        print(f"     ├─ Spatial Coverage : {signals.spatial_coverage * 100:.1f}%")
        print(f"     ├─ Metadata Score   : {signals.metadata_similarity * 100:.1f}%")
        print(f"     ├─ Confidence Score : {signals.overall_confidence:.1f}%")
        print(f"     └─ Access Granted   : {'YES' if is_auth else 'RESTRICTED (Policy Masked)'}")

    # -------------------------------------------------------------------------
    # STEP 6: DELTA PLANNING ACROSS COMPATIBLE REPOSITORIES
    # -------------------------------------------------------------------------
    delta_plan = create_delta_plan(request, candidates, source_capabilities)

    # -------------------------------------------------------------------------
    # STEP 7: SYNTHESIZE SMART ALERT & ACTION RECOMMENDATION
    # -------------------------------------------------------------------------
    best_match = max(match_evaluations, key=lambda x: x.signals.overall_confidence) if match_evaluations else None

    action = RecommendedAction.DOWNLOAD_ANYWAY
    saved_gb = 0.0

    if best_match:
        if not best_match.authorized:
            action = RecommendedAction.REQUEST_ACCESS
            METRICS.access_requests_logged += 1
            METRICS.duplicate_requests_detected += 1
        elif best_match.classification in [MatchClassification.EXACT_BYTE_DUPLICATE, MatchClassification.LOGICAL_DUPLICATE]:
            action = RecommendedAction.USE_EXISTING
            saved_gb = request.expected_size_gb or best_match.candidate.size_gb
            METRICS.downloads_prevented += 1
            METRICS.duplicate_requests_detected += 1
            METRICS.bandwidth_saved_gb += saved_gb
        elif delta_plan.is_applicable and delta_plan.source_supports_delta:
            action = RecommendedAction.DOWNLOAD_DELTA
            saved_gb = delta_plan.reusable_gb
            METRICS.delta_downloads_planned += 1
            METRICS.duplicate_requests_detected += 1
            METRICS.bandwidth_saved_gb += saved_gb

    # -------------------------------------------------------------------------
    # STEP 8: RENDER PRESENTATION SMART ALERT
    # -------------------------------------------------------------------------
    print("\n" + "=" * 65)
    print(" SMART ALERT & ACTION DISPATCH")
    print("=" * 65)

    if action == RecommendedAction.USE_EXISTING and best_match:
        print(f" STATUS : 100% MATCHING REPLICA ALREADY AVAILABLE")
        print(f" TARGET : [{best_match.candidate.repository_node}] {best_match.candidate.display_name}")
        print(f" SAVINGS: {saved_gb:.2f} GB External Transfer Saved (100%)")
        print(f" ACTION : >>> {action.value} <<<")
        print(f" REASON : Cryptographic / semantic parity verified. Mount local replica.")

    elif action == RecommendedAction.DOWNLOAD_DELTA:
        print(f" STATUS : {delta_plan.bandwidth_saved_percentage}% OF REQUESTED DATA ALREADY RESIDES IN CLUSTER")
        print(f" REUSE  : {delta_plan.reusable_gb:.2f} GB from {len(delta_plan.reusable_datasets)} nodes (Period: {delta_plan.reusable_temporal_span})")
        print(f" FETCH  : {delta_plan.additional_download_gb:.2f} GB Delta Only (Period: {delta_plan.missing_temporal_span})")
        print(f" SAVINGS: {delta_plan.bandwidth_saved_percentage}% Bandwidth Reduction")
        print(f" ACTION : >>> {action.value} <<<")
        print(f" REASON : {delta_plan.execution_notes}")

    elif action == RecommendedAction.REQUEST_ACCESS and best_match:
        print(f" STATUS : COMPATIBLE ASSET IDENTIFIED UNDER ACCESS RESTRICTION")
        print(f" NOTICE : A matching dataset exists within an institutional repository.")
        print(f" ACTION : >>> {action.value} <<<")
        print(f" REASON : Access clearance required. Request forwarded to owner.")

    else:
        print(f" STATUS : NO SUFFICIENT INSTITUTIONAL MATCH FOUND")
        print(f" ACTION : >>> {action.value} <<<")
        print(f" REASON : External acquisition authorized.")

    print("=" * 65)
    audit_log(action.value, f"Action resolved to {action.value}", user.id, saved_gb)

    return {
        "action": action,
        "best_match": best_match,
        "delta_plan": delta_plan,
        "saved_gb": saved_gb
    }


# =============================================================================
# 11. DETERMINISTIC TEST SEEDING & DEMO HARNESS
# =============================================================================

def initialize_demo_mesh() -> Tuple[DistributedIndex, DownloadRegistry]:
    """Sets up the 3 repository nodes, agent publishers, and seed datasets."""
    ring = ConsistentHashRing({
        "Node A — Climate Lab": 30,
        "Node B — Remote Sensing Lab": 150,
        "Node C — AI/ML Lab": 270
    })

    distributed_index = DistributedIndex(ring)
    download_registry = DownloadRegistry()

    node_a = RepositoryNode("Node A", "Climate Research Lab")
    node_b = RepositoryNode("Node B", "Remote Sensing Lab")
    node_c = RepositoryNode("Node C", "AI/ML Research Lab")

    agent_a = RepositoryAgent(node_a, distributed_index)
    agent_b = RepositoryAgent(node_b, distributed_index)
    agent_c = RepositoryAgent(node_c, distributed_index)

    # Seed Dataset 1: Node A — India Rainfall 2020-2023
    data_bytes_1 = b"ERA5_INDIA_RAINFALL_2020_2021_2022_2023_PRECIP_TENSOR_SAMPLE_PAYLOAD_CHUNK_DATA" * 8
    chunks_1 = content_defined_chunking(data_bytes_1)
    ds_1 = Dataset(
        id="DDAS-NODEA-CLIM-001",
        display_name="India Rainfall 2020–2023 (ERA5 Reanalysis)",
        owner="Dr. H. Bhabha",
        repository_node="Node A — Climate Lab",
        access_level=AccessLevel.INTERNAL,
        provider="ECMWF",
        source_url="https://cds.climate.copernicus.eu/era5/rainfall_2020_2023.nc",
        dataset_identifier="ERA5_HOURLY_PRECIPITATION",
        variable="precipitation",
        bbox=[68.0, 6.0, 97.0, 37.0],  # India bounds
        time_start=date(2020, 1, 1),
        time_end=date(2023, 12, 31),
        spatial_resolution=0.25,
        temporal_resolution="1-hour",
        format="NetCDF4",
        version="v1.0",
        size_gb=7.4,
        sha256=compute_sha256(data_bytes_1),
        chunks=chunks_1
    )
    agent_a.publish_dataset(ds_1)

    # Seed Dataset 2: Node B — India Precipitation 2024
    data_bytes_2 = b"ERA5_INDIA_PRECIPITATION_2024_ANNUAL_DATA_CUBE_SAMPLE_PAYLOAD" * 8
    chunks_2 = content_defined_chunking(data_bytes_2)
    ds_2 = Dataset(
        id="DDAS-NODEB-RS-002",
        display_name="India Precipitation 2024",
        owner="Dr. V. Sarabhai",
        repository_node="Node B — Remote Sensing Lab",
        access_level=AccessLevel.INTERNAL,
        provider="ECMWF",
        source_url="https://cds.climate.copernicus.eu/era5/precip_2024.nc",
        dataset_identifier="ERA5_HOURLY_PRECIPITATION",
        variable="precipitation",
        bbox=[68.0, 6.0, 97.0, 37.0],
        time_start=date(2024, 1, 1),
        time_end=date(2024, 12, 31),
        spatial_resolution=0.25,
        temporal_resolution="1-hour",
        format="NetCDF4",
        version="v1.0",
        size_gb=2.8,
        sha256=compute_sha256(data_bytes_2),
        chunks=chunks_2
    )
    agent_b.publish_dataset(ds_2)

    # Seed Dataset 3: Node B — isro_export_08_aug.zip (Exact byte match test)
    data_bytes_3 = b"ISRO_OPTICAL_CARTOSAT_TILES_MUMBAI_METRO_CANONICAL_BINARY_PAYLOAD_V2" * 12
    chunks_3 = content_defined_chunking(data_bytes_3)
    ds_3 = Dataset(
        id="DDAS-NODEB-RS-003",
        display_name="ISRO Cartosat-3 Optical Surface Reflectance",
        owner="Remote Sensing Data Manager",
        repository_node="Node B — Remote Sensing Lab",
        access_level=AccessLevel.INTERNAL,
        provider="ISRO",
        source_url="https://bhuvan.nrsc.gov.in/archive/isro_export_08_aug.zip",
        dataset_identifier="CARTOSAT3_SURFACE_REFLECTANCE",
        variable="surface_reflectance",
        bbox=[72.8, 18.9, 73.2, 19.3],
        time_start=date(2024, 8, 1),
        time_end=date(2024, 8, 8),
        spatial_resolution=0.0001,
        temporal_resolution="daily",
        format="GeoTIFF",
        version="v2.0",
        size_gb=5.6,
        sha256=compute_sha256(data_bytes_3),
        chunks=chunks_3
    )
    agent_b.publish_dataset(ds_3)

    # Seed Dataset 4: Node C — Restricted AI Radar Model
    data_bytes_4 = b"DEFENSE_RADAR_SURFACE_POLARIMETRY_RESTRICTED_BINARY_PAYLOAD_CONFIDENTIAL" * 10
    chunks_4 = content_defined_chunking(data_bytes_4)
    ds_4 = Dataset(
        id="DDAS-NODEC-AIML-004",
        display_name="Coastal High-Resolution Polarimetric SAR",
        owner="Defense Systems Lab",
        repository_node="Node C — AI/ML Lab",
        access_level=AccessLevel.RESTRICTED,
        provider="DRDO-ISRO",
        source_url="https://internal.drdo.res.in/secure/sar_polarimetry.zarr",
        dataset_identifier="SAR_COASTAL_POLARIMETRY",
        variable="radar_backscatter",
        bbox=[72.5, 18.5, 73.5, 19.5],
        time_start=date(2024, 1, 1),
        time_end=date(2024, 12, 31),
        spatial_resolution=0.00005,
        temporal_resolution="1-hour",
        format="Zarr",
        version="v1.0",
        size_gb=18.5,
        sha256=compute_sha256(data_bytes_4),
        chunks=chunks_4
    )
    agent_c.publish_dataset(ds_4)

    METRICS.datasets_indexed = 4
    return distributed_index, download_registry


# =============================================================================
# 12. DEMONSTRATION SUITE (5 SCENARIOS)
# =============================================================================

if __name__ == "__main__":
    index, registry = initialize_demo_mesh()

    print("\n" + "#" * 65)
    print("   D³AS BACKEND REFERENCE SUITE — TEST SCENARIO DEMONSTRATIONS")
    print("#" * 65)

    # -------------------------------------------------------------------------
    # SCENARIO 1: PARTIAL / DELTA MATCH
    # Request: India rainfall 2020–2025 (Node A has 2020-23, Node B has 2024)
    # Expected: Stitched 2020-2024 (83% reuse), Download 2025 delta only
    # -------------------------------------------------------------------------
    print("\n>>> SCENARIO 1: MULTI-NODE PARTIAL & DELTA SYNTHESIS <<<")
    user_alice = User("USR-101", "Dr. Alice Roy", "Climate Analytics", AccessLevel.INTERNAL)
    req_1 = DownloadRequest(
        request_id="REQ-2026-001",
        user_id=user_alice.id,
        target_url="https://cds.climate.copernicus.eu/era5/india_rainfall_2020_2025.nc",
        intended_filename="india_precipitation_full_2020_2025.nc",
        provider="ECMWF",
        dataset_identifier="ERA5_HOURLY_PRECIPITATION",
        variable="precipitation",
        bbox=[68.0, 6.0, 97.0, 37.0],
        time_start=date(2020, 1, 1),
        time_end=date(2025, 12, 31),
        spatial_resolution=0.25,
        temporal_resolution="1-hour",
        format="NetCDF4",
        expected_size_gb=12.5
    )
    process_download_request(req_1, user_alice, index, registry)

    # -------------------------------------------------------------------------
    # SCENARIO 2: RENAMED EXACT DUPLICATE (INVARIANT TO FILENAME)
    # Request: satellite_india_FINAL.zip vs Node B's isro_export_08_aug.zip
    # Expected: EXACT_BYTE_DUPLICATE → USE_EXISTING
    # -------------------------------------------------------------------------
    print("\n>>> SCENARIO 2: RENAMED EXACT BYTE DUPLICATE <<<")
    user_bob = User("USR-102", "Bob Jenkins", "Remote Sensing Group", AccessLevel.INTERNAL)
    shared_payload = b"ISRO_OPTICAL_CARTOSAT_TILES_MUMBAI_METRO_CANONICAL_BINARY_PAYLOAD_V2" * 12
    req_2 = DownloadRequest(
        request_id="REQ-2026-002",
        user_id=user_bob.id,
        target_url="https://mirror.geo-data.org/downloads/satellite_india_FINAL.zip",
        intended_filename="satellite_india_FINAL.zip",  # Different filename!
        provider="ISRO",
        dataset_identifier="CARTOSAT3_SURFACE_REFLECTANCE",
        variable="surface_reflectance",
        bbox=[72.8, 18.9, 73.2, 19.3],
        time_start=date(2024, 8, 1),
        time_end=date(2024, 8, 8),
        spatial_resolution=0.0001,
        temporal_resolution="daily",
        format="GeoTIFF",
        expected_size_gb=5.6,
        known_sha256=compute_sha256(shared_payload),
        sample_payload_bytes=shared_payload
    )
    process_download_request(req_2, user_bob, index, registry)

    # -------------------------------------------------------------------------
    # SCENARIO 3: PARTIAL CONTENT MATCH VIA CDC (RABIN CHUNKS)
    # Two datasets sharing common content-defined slices
    # -------------------------------------------------------------------------
    print("\n>>> SCENARIO 3: PARTIAL CONTENT OVERLAP VIA CDC <<<")
    user_carol = User("USR-103", "Carol Danvers", "Earth Science Lab", AccessLevel.INTERNAL)
    # Payload shares 75% identical data with Node A's rainfall tensor
    partial_bytes = (b"ERA5_INDIA_RAINFALL_2020_2021_2022_2023_PRECIP_TENSOR_SAMPLE_PAYLOAD_CHUNK_DATA" * 6) + (b"NEW_LOCAL_WEATHER_MODIFICATION_OFFSET_BYTES" * 2)
    req_3 = DownloadRequest(
        request_id="REQ-2026-003",
        user_id=user_carol.id,
        target_url="https://cds.climate.copernicus.eu/era5/india_rainfall_patch.nc",
        intended_filename="india_rainfall_patched_v2.nc",
        provider="ECMWF",
        dataset_identifier="ERA5_HOURLY_PRECIPITATION",
        variable="precipitation",
        bbox=[68.0, 6.0, 97.0, 37.0],
        time_start=date(2020, 1, 1),
        time_end=date(2023, 12, 31),
        spatial_resolution=0.25,
        temporal_resolution="1-hour",
        format="NetCDF4",
        expected_size_gb=7.4,
        sample_payload_bytes=partial_bytes
    )
    process_download_request(req_3, user_carol, index, registry)

    # -------------------------------------------------------------------------
    # SCENARIO 4: RESTRICTED DATASET ZERO-LEAKAGE RBAC
    # Standard user requests data matching Node C restricted asset
    # Expected: REQUEST_ACCESS, sensitive node/owner metadata completely masked
    # -------------------------------------------------------------------------
    print("\n>>> SCENARIO 4: ZERO-LEAKAGE PRIVACY FIREWALL & RBAC <<<")
    user_guest = User("USR-104", "David Guest", "Guest Researcher", AccessLevel.PUBLIC)
    req_4 = DownloadRequest(
        request_id="REQ-2026-004",
        user_id=user_guest.id,
        target_url="https://external.defense-satellite.org/radar/mumbai_sar.zarr",
        intended_filename="mumbai_sar_polarimetry_2024.zarr",
        provider="DRDO-ISRO",
        dataset_identifier="SAR_COASTAL_POLARIMETRY",
        variable="radar_backscatter",
        bbox=[72.5, 18.5, 73.5, 19.5],
        time_start=date(2024, 1, 1),
        time_end=date(2024, 12, 31),
        spatial_resolution=0.00005,
        temporal_resolution="1-hour",
        format="Zarr",
        expected_size_gb=18.5
    )
    process_download_request(req_4, user_guest, index, registry)

    # -------------------------------------------------------------------------
    # SCENARIO 5: CONCURRENT IN-FLIGHT TRANSFER INTERCEPTION
    # Alice downloads ERA5 2026 dataset; Frank requests same key concurrently
    # Expected: WAIT_AND_REUSE recommendation
    # -------------------------------------------------------------------------
    print("\n>>> SCENARIO 5: CONCURRENT IN-FLIGHT DOWNLOAD INTERCEPTION <<<")
    registry.register_start("ecmwf:era5_ocean_waves:wave_height:2026-2026", "Dr. Alice Roy", "REQ-2026-ACTIVE")
    user_frank = User("USR-105", "Frank Miller", "Oceanography Division", AccessLevel.INTERNAL)
    req_5 = DownloadRequest(
        request_id="REQ-2026-005",
        user_id=user_frank.id,
        target_url="https://cds.climate.copernicus.eu/era5/ocean_waves_2026.nc",
        intended_filename="ocean_waves_2026.nc",
        provider="ECMWF",
        dataset_identifier="ERA5_OCEAN_WAVES",
        variable="wave_height",
        bbox=[65.0, 5.0, 95.0, 25.0],
        time_start=date(2026, 1, 1),
        time_end=date(2026, 12, 31),
        spatial_resolution=0.5,
        temporal_resolution="3-hour",
        format="NetCDF4",
        expected_size_gb=8.2
    )
    process_download_request(req_5, user_frank, index, registry)

    # -------------------------------------------------------------------------
    # FINAL METRICS & AUDIT TRAIL
    # -------------------------------------------------------------------------
    METRICS.print_dashboard()

    print("=" * 65)
    print(" RECENT AUDIT LEDGER ENTRIES (First 5 records):")
    print("=" * 65)
    for entry in AUDIT_RECORDS[:5]:
        print(f" [{entry['timestamp']}] {entry['event']:<24} | User: {entry['user']} | {entry['details']}")
    print("=" * 65 + "\n")

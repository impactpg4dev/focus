// focus/src/pages/activity/hasil-pencarian/HasilPencarian.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    Box,
    Container,
    Typography,
    Paper,
    TextField,
    IconButton,
    CircularProgress,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Divider,
    AppBar as MuiAppBar,
    Toolbar,
    Button,
    Tabs as MuiTabs,
    Tab,
} from "@mui/material";
import {
    Search as SearchIcon,
    Clear as ClearIcon,
    ArrowBack as ArrowBackIcon,
    LocationOn as LocationIcon,
} from "@mui/icons-material";
import { database, ref, get, child } from "../../../config/firebase";
import { useAuth } from "../../../context/AuthContext";
import Dialog from "../../../components/feedback/dialog/Dialog";

const SELECTED_TAB_KEY = "selectedTabHasilPencarian";

const HasilPencarian = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { userData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [searchValue, setSearchValue] = useState("");
    const [results, setResults] = useState([]);
    const [allLokasi, setAllLokasi] = useState([]);

    const [tabs, setTabs] = useState([]);
    const [selectedTab, setSelectedTab] = useState(null);
    const [daftarAktivitas, setDaftarAktivitas] = useState([]);
    const [userRoleNames, setUserRoleNames] = useState([]);
    const [userRoleIds, setUserRoleIds] = useState([]);
    const [filterJenisTanamanMap, setFilterJenisTanamanMap] = useState({});
    const [aktivitasMap, setAktivitasMap] = useState({});

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedLokasi, setSelectedLokasi] = useState(null);

    const searchQuery = location.state?.searchQuery || "";

    // ============================================================
    // 1. Ambil role user & data aktivitas
    // ============================================================
    const fetchUserRoles = async () => {
        try {
            const dbRef = ref(database);
            const uid = userData?.uid;
            if (!uid) return { roleIds: [], roleNames: [] };

            const userRolesSnapshot = await get(child(dbRef, "user_roles"));
            const userRolesData = userRolesSnapshot.val();
            if (!userRolesData) return { roleIds: [], roleNames: [] };

            const userRoleKeys = Object.keys(userRolesData).filter(
                (key) => userRolesData[key].uid === uid
            );
            if (userRoleKeys.length === 0) return { roleIds: [], roleNames: [] };

            const roleIds = userRoleKeys.map((key) => userRolesData[key].id_role);
            const roleSnapshot = await get(child(dbRef, "u_role"));
            const roleData = roleSnapshot.val();
            if (!roleData) return { roleIds, roleNames: [] };

            const roleNames = [];
            Object.values(roleData).forEach((role) => {
                if (roleIds.includes(role.id_role) && role.is_active === true) {
                    roleNames.push(role.nama_role);
                }
            });
            return { roleIds, roleNames };
        } catch (error) {
            console.error("Error fetching user roles:", error);
            return { roleIds: [], roleNames: [] };
        }
    };

    const fetchActivitiesAndFilters = async () => {
        try {
            const dbRef = ref(database);
            const uid = userData?.uid;
            if (!uid) return;

            const { roleIds, roleNames } = await fetchUserRoles();
            setUserRoleIds(roleIds);
            setUserRoleNames(roleNames);

            const aktivitasSnapshot = await get(child(dbRef, "dtb_aktivitas"));
            const aktivitasData = aktivitasSnapshot.val() || {};
            const aktivitasMapTemp = {};
            Object.values(aktivitasData).forEach((a) => {
                if (a.is_active !== false) {
                    aktivitasMapTemp[a.id_aktivitas] = a;
                }
            });
            setAktivitasMap(aktivitasMapTemp);

            const daftarSnapshot = await get(child(dbRef, "dtb_daftar_aktivitas"));
            const daftarData = daftarSnapshot.val() || {};

            const activeDaftar = Object.values(daftarData).filter(
                (item) =>
                    item.is_active === true &&
                    roleNames.includes(item.nama_daftar_aktivitas)
            );
            setDaftarAktivitas(activeDaftar);

            const uniqueMap = {};
            activeDaftar.forEach((item) => {
                const key = item.nama_daftar_aktivitas;
                if (!uniqueMap[key]) {
                    uniqueMap[key] = {
                        id_daftar_aktivitas: item.id_daftar_aktivitas,
                        nama_daftar_aktivitas: item.nama_daftar_aktivitas,
                        aktivitas_id: item.aktivitas_id,
                    };
                }
            });
            const tabList = Object.values(uniqueMap).map((item) => ({
                id_aktivitas: item.id_daftar_aktivitas,
                nama_aktivitas: item.nama_daftar_aktivitas,
                aktivitas_id: item.aktivitas_id,
            }));
            setTabs(tabList);

            const filterSnapshot = await get(
                child(dbRef, "dtb_filter_lokasi_aktivitas")
            );
            const filterData = filterSnapshot.val() || {};
            const jenisTanamanMap = {};
            Object.values(filterData).forEach((filter) => {
                if (
                    filter.is_active === true &&
                    filter.daftar_aktivitas_id &&
                    filter.jenis_tanaman
                ) {
                    jenisTanamanMap[filter.daftar_aktivitas_id] =
                        filter.jenis_tanaman;
                }
            });
            setFilterJenisTanamanMap(jenisTanamanMap);

            if (tabList.length > 0) {
                const savedTab = sessionStorage.getItem(SELECTED_TAB_KEY);
                if (savedTab && tabList.some((tab) => tab.id_aktivitas === savedTab)) {
                    setSelectedTab(savedTab);
                } else {
                    setSelectedTab(tabList[0].id_aktivitas);
                    sessionStorage.setItem(SELECTED_TAB_KEY, tabList[0].id_aktivitas);
                }
            }
        } catch (error) {
            console.error("Error fetching activities:", error);
        }
    };

    // ============================================================
    // 2. Fungsi pengecekan izin membuat (AND - posisi + role)
    // ============================================================
    const isUserAllowedToCreate = (daftarAktivitasId) => {
        const daftarItem = daftarAktivitas.find(
            (item) => item.id_daftar_aktivitas === daftarAktivitasId
        );
        if (!daftarItem) return false;

        let allowedPositions = daftarItem.allowed_by_position;
        let allowedRoles = daftarItem.allowed_by_role;

        if (
            allowedPositions &&
            typeof allowedPositions === "object" &&
            !Array.isArray(allowedPositions)
        ) {
            allowedPositions = Object.values(allowedPositions);
        }
        if (
            allowedRoles &&
            typeof allowedRoles === "object" &&
            !Array.isArray(allowedRoles)
        ) {
            allowedRoles = Object.values(allowedRoles);
        }

        allowedPositions = Array.isArray(allowedPositions) ? allowedPositions : [];
        allowedRoles = Array.isArray(allowedRoles) ? allowedRoles : [];

        const positionMatch =
            userData?.id_jabatan && allowedPositions.includes(userData.id_jabatan);
        const roleMatch = userRoleIds.some((roleId) => allowedRoles.includes(roleId));

        return positionMatch && roleMatch;
    };

    // ============================================================
    // 3. Fetch data lokasi (tb_status_lokasi)
    // ============================================================
    const fetchLokasiData = async () => {
        setLoading(true);
        try {
            const dbRef = ref(database);
            const lokasiSnapshot = await get(child(dbRef, "tb_status_lokasi"));
            const lokasiData = lokasiSnapshot.val();

            if (lokasiData) {
                const lokasiList = Object.values(lokasiData);
                const activeLokasi = lokasiList.filter(
                    (item) => item.is_active !== false
                );

                const lokasiMap = new Map();
                activeLokasi.forEach((item) => {
                    const key = item.lokasi;
                    if (
                        !lokasiMap.has(key) ||
                        new Date(item.tanggal_mulai_perawatan) >
                            new Date(lokasiMap.get(key).tanggal_mulai_perawatan)
                    ) {
                        lokasiMap.set(key, item);
                    }
                });
                const uniqueLokasi = Array.from(lokasiMap.values());
                setAllLokasi(uniqueLokasi);
            }
        } catch (error) {
            console.error("Error fetching lokasi data:", error);
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // 4. Filter hasil
    // ============================================================
    const getFilteredResults = () => {
        let filtered = allLokasi;

        if (selectedTab) {
            const jenisTanaman = filterJenisTanamanMap[selectedTab];
            if (jenisTanaman) {
                filtered = filtered.filter(
                    (item) => item.jenis_tanaman === jenisTanaman
                );
            } else {
                filtered = [];
            }
        }

        if (searchValue.trim()) {
            const keyword = searchValue.toLowerCase();
            filtered = filtered.filter((item) => {
                const lokasi = item.lokasi || "";
                const deskripsi = item.deskripsi || "";
                const jenisTanaman = item.jenis_tanaman || "";
                return (
                    lokasi.toLowerCase().includes(keyword) ||
                    deskripsi.toLowerCase().includes(keyword) ||
                    jenisTanaman.toLowerCase().includes(keyword)
                );
            });
        }

        return filtered;
    };

    // ============================================================
    // 5. Effect: ambil data saat userData tersedia
    // ============================================================
    useEffect(() => {
        const init = async () => {
            if (!userData?.uid) return; // Tunggu userData tersedia
            await fetchActivitiesAndFilters();
            await fetchLokasiData();
            setSearchValue(searchQuery || "");
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userData]); // userData sebagai dependency

    useEffect(() => {
        if (!loading) {
            const filtered = getFilteredResults();
            setResults(filtered);
        }
    }, [allLokasi, searchValue, selectedTab, loading]);

    // ============================================================
    // 6. Handler
    // ============================================================
    const handleSearch = () => {
        if (searchValue.trim()) {
            fetchLokasiData();
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    const handleClear = () => {
        setSearchValue("");
    };

    const handleBack = () => {
        navigate(-1);
    };

    const handleTabChange = (tab) => {
        setSelectedTab(tab.id_aktivitas);
        sessionStorage.setItem(SELECTED_TAB_KEY, tab.id_aktivitas);
    };

    const handleItemClick = (lokasi) => {
        setSelectedLokasi(lokasi);
        setDialogOpen(true);
    };

    const handleDialogClose = () => {
        setDialogOpen(false);
        setSelectedLokasi(null);
    };

    const handleBuatBaru = () => {
        setDialogOpen(false);
        const selectedTabData = tabs.find(
            (tab) => tab.id_aktivitas === selectedTab
        );
        if (!selectedTabData || !selectedLokasi) return;

        const aktivitasData = aktivitasMap[selectedTabData.aktivitas_id];
        if (!aktivitasData) {
            console.error(
                "Aktivitas tidak ditemukan untuk id:",
                selectedTabData.aktivitas_id
            );
            return;
        }

        const daftarItem = daftarAktivitas.find(
            (item) => item.id_daftar_aktivitas === selectedTab
        );
        if (!daftarItem) return;

        navigate("/tambah-identitas", {
            state: {
                activity: {
                    id_aktivitas: aktivitasData.id_aktivitas,
                    nama_aktivitas: aktivitasData.nama_aktivitas,
                    inisial: aktivitasData.inisial,
                },
                daftarAktivitasId: daftarItem.id_daftar_aktivitas,
                lokasiTerpilih: {
                    id_lokasi: selectedLokasi.id_lokasi,
                    label: selectedLokasi.lokasi,
                },
            },
        });
    };

    const handleLihatData = () => {
        setDialogOpen(false);
        const selectedTabData = tabs.find(
            (tab) => tab.id_aktivitas === selectedTab
        );
        if (!selectedTabData || !selectedLokasi) return;

        const aktivitasData = aktivitasMap[selectedTabData.aktivitas_id];
        if (!aktivitasData) return;

        const daftarItem = daftarAktivitas.find(
            (item) => item.id_daftar_aktivitas === selectedTab
        );
        if (!daftarItem) return;

        navigate("/data-identitas", {
            state: {
                daftarAktivitasId: daftarItem.id_daftar_aktivitas,
                aktivitasId: aktivitasData.id_aktivitas,
                title: aktivitasData.nama_aktivitas,
                filterLokasi: selectedLokasi.id_lokasi,
                fromSearch: true,
            },
        });
    };

    const showBuatBaru = selectedLokasi && isUserAllowedToCreate(selectedTab);

    // ============================================================
    // 7. Render
    // ============================================================
    return (
        <Box sx={{ bgcolor: "background.default", minHeight: "100vh", pt: 0 }}>
            <Box sx={{ height: 112, flexShrink: 0 }} />
            <Box
                sx={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 1100,
                    display: "flex",
                    justifyContent: "center",
                    minHeight: 56,
                }}
            >
                <Container maxWidth="sm" sx={{ px: 0, minHeight: 56 }}>
                    <MuiAppBar
                        position="sticky"
                        color="default"
                        elevation={1}
                        sx={{
                            bgcolor: "primary.main",
                            borderBottom: "1px solid",
                            borderColor: "divider",
                            maxWidth: "600px",
                            margin: "0 auto",
                            left: 0,
                            right: 0,
                            width: "100%",
                            borderRadius: 0,
                            minHeight: 56,
                        }}
                    >
                        <Container
                            maxWidth="sm"
                            sx={{ p: 1, px: "8px !important", minHeight: 56 }}
                        >
                            <Toolbar
                                sx={{
                                    px: "0px !important",
                                    bgcolor: "rgba(255, 255, 255, 0.23)",
                                    borderRadius: "4px",
                                    minHeight: "48px !important",
                                    height: 48,
                                }}
                            >
                                <IconButton
                                    edge="start"
                                    onClick={handleBack}
                                    aria-label="back"
                                    sx={{ mx: "4px" }}
                                >
                                    <ArrowBackIcon sx={{ color: "#ffffff" }} />
                                </IconButton>

                                <TextField
                                    fullWidth
                                    variant="standard"
                                    placeholder="Cari kode lokasi..."
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    autoFocus
                                    InputProps={{
                                        disableUnderline: true,
                                        sx: {
                                            fontSize: "0.875rem",
                                            py: 1,
                                            color: "white",
                                            "&::placeholder": {
                                                color: "rgba(255, 255, 255, 0.7)",
                                            },
                                        },
                                    }}
                                    sx={{
                                        flex: 1,
                                        "& .MuiInputBase-root": {
                                            "&:before": { display: "none" },
                                            "&:after": { display: "none" },
                                        },
                                        "& .MuiInputBase-input": {
                                            color: "white",
                                            "&::placeholder": {
                                                color: "rgba(255, 255, 255, 0.7)",
                                                opacity: 1,
                                            },
                                        },
                                    }}
                                />

                                {searchValue && (
                                    <IconButton
                                        onClick={handleClear}
                                        aria-label="clear"
                                        sx={{ mx: 0, color: "white" }}
                                    >
                                        <ClearIcon />
                                    </IconButton>
                                )}

                                <IconButton
                                    onClick={handleSearch}
                                    aria-label="search"
                                    sx={{ ml: 0, mr: 0.5, color: "white" }}
                                >
                                    <SearchIcon />
                                </IconButton>
                            </Toolbar>
                        </Container>
                        {tabs.length > 0 && (
                            <Box
                                sx={{
                                    mb: 0,
                                    overflowX: "auto",
                                    "&::-webkit-scrollbar": { display: "none" },
                                    scrollbarWidth: "none",
                                    bgcolor: "primary.main",
                                }}
                            >
                                <MuiTabs
                                    value={
                                        selectedTab ||
                                        (tabs.length > 0 ? tabs[0].id_aktivitas : null)
                                    }
                                    onChange={(e, newValue) => {
                                        const tab = tabs.find(
                                            (t) => t.id_aktivitas === newValue
                                        );
                                        if (tab) handleTabChange(tab);
                                    }}
                                    variant="scrollable"
                                    scrollButtons={false}
                                    allowScrollButtonsMobile={false}
                                    sx={{
                                        minHeight: 48,
                                        "& .MuiTab-root": {
                                            minWidth: "auto",
                                            px: 2,
                                            textTransform: "none",
                                            fontWeight: 500,
                                            fontSize: "0.875rem",
                                            color: "rgba(255,255,255,0.7)",
                                            "&.Mui-selected": {
                                                color: "#ffffff",
                                                fontWeight: 600,
                                            },
                                        },
                                        "& .MuiTabs-indicator": {
                                            backgroundColor: "#ffffff",
                                            height: 3,
                                        },
                                    }}
                                >
                                    {tabs.map((tab) => (
                                        <Tab
                                            key={tab.id_aktivitas}
                                            label={tab.nama_aktivitas}
                                            value={tab.id_aktivitas}
                                            wrapped={false}
                                        />
                                    ))}
                                </MuiTabs>
                            </Box>
                        )}
                    </MuiAppBar>
                </Container>
            </Box>

            <Container maxWidth="sm" sx={{ pt: 2, pb: 8, px: 2 }}>
                {loading ? (
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            py: 4,
                        }}
                    >
                        <CircularProgress />
                    </Box>
                ) : results.length === 0 ? (
                    <Paper sx={{ p: 4, borderRadius: "4px", textAlign: "center" }}>
                        <Typography variant="body1" color="text.secondary">
                            {searchValue
                                ? `Tidak ditemukan hasil untuk "${searchValue}"`
                                : "Masukkan kata kunci pencarian"}
                        </Typography>
                    </Paper>
                ) : (
                    <Paper sx={{ borderRadius: "4px" }}>
                        <List sx={{ p: 0 }}>
                            {results.map((item, index) => (
                                <React.Fragment key={item.id_lokasi || index}>
                                    <ListItem
                                        sx={{
                                            py: 2,
                                            cursor: "pointer",
                                            "&:hover": { bgcolor: "action.hover" },
                                        }}
                                        onClick={() => handleItemClick(item)}
                                    >
                                        <ListItemAvatar>
                                            <Avatar sx={{ bgcolor: "primary.light" }}>
                                                <LocationIcon />
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={
                                                <Typography variant="body2" fontWeight="500">
                                                    {item.lokasi || "-"}
                                                </Typography>
                                            }
                                            secondary={
                                                <>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                        display="block"
                                                    >
                                                        Jenis Tanaman: {item.jenis_tanaman || "-"}
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                        display="block"
                                                    >
                                                        Deskripsi: {item.deskripsi || "-"}
                                                    </Typography>
                                                </>
                                            }
                                        />
                                    </ListItem>
                                    {index < results.length - 1 && <Divider />}
                                </React.Fragment>
                            ))}
                        </List>
                    </Paper>
                )}
            </Container>

            <Dialog
                open={dialogOpen}
                onClose={handleDialogClose}
                title="Pilih Aksi"
                message={
                    selectedLokasi ? (
                        <>
                            <Typography variant="body1" sx={{ mb: 1 }}>
                                <strong>Lokasi:</strong> {selectedLokasi.lokasi}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Pilih tindakan yang ingin Anda lakukan:
                            </Typography>
                        </>
                    ) : (
                        "Pilih tindakan"
                    )
                }
                variant="info"
                showCloseButton
                hideConfirmButton
                hideCancelButton
            >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
                    {showBuatBaru && (
                        <Button
                            variant="outlined"
                            onClick={handleBuatBaru}
                            sx={{
                                borderRadius: "4px",
                                textTransform: "none",
                                py: 1.5,
                                justifyContent: "center",
                            }}
                        >
                            Buat Baru
                        </Button>
                    )}
                    <Button
                        variant="outlined"
                        color="secondary"
                        onClick={handleLihatData}
                        sx={{
                            borderRadius: "4px",
                            textTransform: "none",
                            py: 1.5,
                            justifyContent: "center",
                        }}
                    >
                        Lihat Data
                    </Button>
                </Box>
            </Dialog>
        </Box>
    );
};

export default HasilPencarian;
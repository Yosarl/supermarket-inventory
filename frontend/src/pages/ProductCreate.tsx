import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Grid,
  MenuItem,
  Autocomplete,
  IconButton,
  InputLabelProps,
  Dialog,
  Checkbox,
  FormControlLabel,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/Save';
import ClearIcon from '@mui/icons-material/Clear';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { useAppSelector } from '../store/hooks';
import { productApi } from '../services/api';
import DateInput from '../components/DateInput';

const labelShrink: InputLabelProps = { shrink: true };

interface Unit {
  _id: string;
  name?: string;
  shortCode: string;
}

interface Category {
  _id: string;
  name: string;
  code: string;
}

interface ProductOption {
  _id: string;
  name: string;
  code?: string;
  imei?: string;
}

interface MultiUnitRow {
  id: string;
  multiUnitId?: string; // System generated ID, stored in database but not displayed
  imei: string;
  conversion: string;
  unitId: string;
  wholesale: string;
  retail: string;
  specialPrice1: string;
  specialPrice2: string;
}

export default function ProductCreate() {
  const navigate = useNavigate();
  const companyId = useAppSelector((s) => s.app.selectedCompanyId);
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [itemGroups, setItemGroups] = useState<string[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryDialogName, setCategoryDialogName] = useState('');
  const [categoryDialogCode, setCategoryDialogCode] = useState('');
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [unitDialogName, setUnitDialogName] = useState('');
  const [unitDialogShortCode, setUnitDialogShortCode] = useState('');
  const [itemGroupDialogOpen, setItemGroupDialogOpen] = useState(false);
  const [itemGroupDialogName, setItemGroupDialogName] = useState('');
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [brandDialogName, setBrandDialogName] = useState('');
  const [brands, setBrands] = useState<string[]>([]);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingUnit, setSavingUnit] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [imei, setImei] = useState('');
  const [itemGroup, setItemGroup] = useState('');
  const [brand, setBrand] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [retailPrice, setRetailPrice] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [specialPrice, setSpecialPrice] = useState('');
  const [specialPrice2, setSpecialPrice2] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [allowBatches, setAllowBatches] = useState(true);
  const [disableBatchesConfirmOpen, setDisableBatchesConfirmOpen] = useState(false);
  const [enableBatchesConfirmOpen, setEnableBatchesConfirmOpen] = useState(false);
  const [multiUnits, setMultiUnits] = useState<MultiUnitRow[]>([]);
  const [pricesDialogRowId, setPricesDialogRowId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editModeActive, setEditModeActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successDialogMessage, setSuccessDialogMessage] = useState('');
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDialogMessage, setErrorDialogMessage] = useState('');
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);
  const [editedDialogOpen, setEditedDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  // Change Product Name Dialog
  const [changeNameDialogOpen, setChangeNameDialogOpen] = useState(false);
  const [changeNameCode, setChangeNameCode] = useState('');
  const [changeNameValue, setChangeNameValue] = useState('');
  const [changeNameSaving, setChangeNameSaving] = useState(false);
  
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
  const imagePreviewSrc = imageUrl && (imageUrl.startsWith('http') || imageUrl.startsWith('data:')) ? imageUrl : (imageUrl ? (imageUrl.startsWith('/') ? imageUrl : `/${imageUrl.replace(/^\//, '')}`) : '');

  const loadNextCode = useCallback(() => {
    if (!companyId) return;
    productApi.getNextCode(companyId).then((res) => {
      const c = (res.data.data as { code: string })?.code;
      if (c) setCode(c);
    }).catch(() => setCode('prod1'));
  }, [companyId]);

  const refreshCategories = useCallback(() => {
    if (!companyId) return;
    productApi.getCategories(companyId).then((res) => setCategories((res.data.data as Category[]) ?? []));
  }, [companyId]);
  const refreshUnits = useCallback(() => {
    if (!companyId) return;
    productApi.getUnits(companyId).then((res) => setUnits((res.data.data as Unit[]) ?? []));
  }, [companyId]);
  const refreshItemGroups = useCallback(() => {
    if (!companyId) return;
    productApi.getItemGroups(companyId).then((res) => setItemGroups((res.data.data as string[]) ?? []));
  }, [companyId]);
  const refreshBrands = useCallback(() => {
    if (!companyId) return;
    productApi.getBrands(companyId).then((res) => setBrands((res.data.data as string[]) ?? [])).catch(() => setBrands([]));
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    productApi.getUnits(companyId).then((res) => setUnits((res.data.data as Unit[]) ?? []));
    productApi.getCategories(companyId).then((res) => setCategories((res.data.data as Category[]) ?? []));
    productApi.getItemGroups(companyId).then((res) => setItemGroups((res.data.data as string[]) ?? []));
    productApi.getBrands(companyId).then((res) => setBrands((res.data.data as string[]) ?? [])).catch(() => setBrands([]));
    loadNextCode();
  }, [companyId, loadNextCode]);

  useEffect(() => {
    if (!companyId) return;
    const search = productSearch.trim();
    if (!search) {
      setProductOptions([]);
      return;
    }
    const t = setTimeout(() => {
      productApi.list(companyId, { search, limit: 25 }).then((res) => {
        const d = res.data.data as { products: ProductOption[] };
        setProductOptions(d?.products ?? []);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [companyId, productSearch]);

  const loadProductIntoForm = useCallback((p: Record<string, unknown>) => {
    const id = p._id as string;
    const pName = (p.name as string) ?? '';
    setEditingId(id);
    setEditModeActive(false);
    setSelectedProduct({ _id: id, name: pName, code: p.code as string, imei: p.imei as string });
    setProductSearch(pName);
    setCode((p.code as string) ?? '');
    setName(pName);
    setImei((p.imei as string) ?? '');
    setItemGroup((p.itemGroup as string) ?? '');
    setBrand((p.brand as string) ?? '');
    setCategoryId((p.categoryId as { _id?: string })?._id ?? (p.categoryId as string) ?? '');
    setUnitId((p.unitOfMeasureId as { _id?: string })?._id ?? (p.unitOfMeasureId as string) ?? '');
    setRetailPrice(String(p.retailPrice ?? p.sellingPrice ?? ''));
    setWholesalePrice(String(p.wholesalePrice ?? p.mrp ?? ''));
    setPurchasePrice(String(p.purchasePrice ?? ''));
    setSpecialPrice(String(p.specialPrice ?? ''));
    setSpecialPrice2(String(p.specialPrice2 ?? ''));
    setExpiryDate(p.expiryDate ? new Date(p.expiryDate as string).toISOString().slice(0, 10) : '');
    setImageUrl((p.imageUrl as string) ?? '');
    setAllowBatches((p as any).allowBatches !== false);
    const mus = (p.multiUnits as Array<{ multiUnitId?: string; imei?: string; conversion?: number; price?: number; unitId?: { _id: string } | string; wholesale?: number; retail?: number; specialPrice1?: number; specialPrice2?: number }>) ?? [];
    setMultiUnits(mus.map((u, i) => {
      return {
        id: `mu-${i}-${Date.now()}`,
        multiUnitId: u.multiUnitId, // Preserve system-generated ID from database
        imei: String(u.imei ?? ''),
        conversion: String(u.conversion ?? ''),
        unitId: typeof u.unitId === 'object' ? (u.unitId?._id ?? '') : (u.unitId ?? ''),
        wholesale: String(u.wholesale ?? ''),
        retail: String(u.retail ?? ''),
        specialPrice1: String(u.specialPrice1 ?? ''),
        specialPrice2: String(u.specialPrice2 ?? ''),
      };
    }));
  }, []);

  const searchByImei = useCallback((imeiValue: string) => {
    if (!companyId || !imeiValue.trim()) return;
    productApi.getByImei(companyId, imeiValue.trim()).then((res) => {
      const responseData = res.data.data as { product?: Record<string, unknown> } | null;
      if (responseData?.product) {
        loadProductIntoForm(responseData.product);
        setSuccessDialogMessage('Product loaded');
        setSuccessDialogOpen(true);
      } else {
        setErrorDialogMessage('Product not found for this IMEI');
        setErrorDialogOpen(true);
      }
    }).catch(() => {
      setErrorDialogMessage('Product not found for this IMEI');
      setErrorDialogOpen(true);
    });
  }, [companyId, loadProductIntoForm]);

  const handleImeiKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || !companyId || !imei.trim()) return;
    e.preventDefault();
    searchByImei(imei);
  };

  const handleImeiBlur = () => {
    // Only search if there's an IMEI value and no product is currently selected
    if (!selectedProduct && imei.trim()) {
      searchByImei(imei);
    }
  };

  const handleProductSelect = (_: unknown, value: ProductOption | null) => {
    setSelectedProduct(value);
    if (!value) {
      setEditingId(null);
      setName(productSearch);
      return;
    }
    productApi.get(value._id, companyId!).then((res) => {
      loadProductIntoForm(res.data.data as Record<string, unknown>);
    });
  };

  const handleOpenCategoryDialog = () => {
    setCategoryDialogName('');
    setCategoryDialogCode('');
    setCategoryDialogOpen(true);
  };
  const handleSaveCategory = async () => {
    if (!companyId || !categoryDialogName.trim()) return;
    setSavingCategory(true);
    try {
      const res = await productApi.createCategory(companyId, {
        name: categoryDialogName.trim(),
        code: categoryDialogCode.trim() || categoryDialogName.trim(),
      });
      const newCat = res.data.data as Category;
      refreshCategories();
      if (newCat?._id) setCategoryId(newCat._id);
      setCategoryDialogOpen(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to add category';
      setErrorDialogMessage(msg);
      setErrorDialogOpen(true);
    } finally {
      setSavingCategory(false);
    }
  };
  const handleOpenUnitDialog = () => {
    setUnitDialogName('');
    setUnitDialogShortCode('');
    setUnitDialogOpen(true);
  };
  const handleSaveUnit = async () => {
    if (!companyId || !unitDialogName.trim()) return;
    setSavingUnit(true);
    try {
      const res = await productApi.createUnit(companyId, {
        name: unitDialogName.trim(),
        shortCode: unitDialogShortCode.trim() || unitDialogName.trim().slice(0, 5),
      });
      const newUnit = res.data.data as Unit;
      refreshUnits();
      if (newUnit?._id) setUnitId(newUnit._id);
      setUnitDialogOpen(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to add unit';
      setErrorDialogMessage(msg);
      setErrorDialogOpen(true);
    } finally {
      setSavingUnit(false);
    }
  };

  const handleOpenItemGroupDialog = () => {
    setItemGroupDialogName('');
    setItemGroupDialogOpen(true);
  };
  const handleSaveItemGroup = () => {
    const name = itemGroupDialogName.trim();
    if (!name) return;
    setItemGroup(name);
    setItemGroups((prev) => (prev.includes(name) ? prev : [...prev, name].sort()));
    setItemGroupDialogOpen(false);
  };

  const handleOpenBrandDialog = () => {
    setBrandDialogName('');
    setBrandDialogOpen(true);
  };
  const handleSaveBrand = () => {
    const name = brandDialogName.trim();
    if (!name) return;
    setBrand(name);
    setBrands((prev) => (prev.includes(name) ? prev : [...prev, name].sort()));
    setBrandDialogOpen(false);
  };

  const addMultiUnitRow = () => {
    setMultiUnits((prev) => [...prev, { id: `mu-${Date.now()}`, imei: '', conversion: '1', unitId: unitId || (units[0]?._id ?? ''), wholesale: '', retail: '', specialPrice1: '', specialPrice2: '' }]);
  };

  const removeMultiUnitRow = (id: string) => {
    setMultiUnits((prev) => prev.filter((r) => r.id !== id));
  };

  const updateMultiUnit = (id: string, field: keyof MultiUnitRow, value: string) => {
    setMultiUnits((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      return { ...r, [field]: value };
    }));
  };

  const handleClear = () => {
    setEditingId(null);
    setEditModeActive(false);
    setSelectedProduct(null);
    setProductSearch('');
    setCode('');
    setName('');
    setImei('');
    setItemGroup('');
    setBrand('');
    setCategoryId('');
    setUnitId('');
    setRetailPrice('');
    setWholesalePrice('');
    setPurchasePrice('');
    setSpecialPrice('');
    setSpecialPrice2('');
    setExpiryDate('');
    setImageUrl('');
    setAllowBatches(true);
    setMultiUnits([]);
    loadNextCode();
  };

  const getUpdatePayload = () => ({
    companyId,
    code: code.trim() || undefined,
    name: name.trim(),
    imei: imei.trim() || undefined,
    itemGroup: itemGroup.trim() || undefined,
    brand: brand.trim() || undefined,
    categoryId: categoryId || undefined,
    unitOfMeasureId: unitId,
    retailPrice: retailPrice ? Number(retailPrice) : 0,
    wholesalePrice: wholesalePrice ? Number(wholesalePrice) : 0,
    purchasePrice: purchasePrice ? Number(purchasePrice) : 0,
    specialPrice: specialPrice ? Number(specialPrice) : undefined,
    specialPrice2: specialPrice2 ? Number(specialPrice2) : undefined,
    expiryDate: expiryDate || undefined,
    imageUrl: imageUrl.trim() || undefined,
    allowBatches,
    multiUnits: allowBatches ? [] : multiUnits
      .filter((r) => r.imei.trim() || r.conversion.trim())
      .map((r) => ({
        multiUnitId: r.multiUnitId, // Preserve existing multiUnitId or let backend generate new one
        imei: r.imei.trim(),
        conversion: Number(r.conversion) || 1,
        price: 0,
        totalPrice: 0,
        unitId: r.unitId,
        wholesale: Number(r.wholesale) || 0,
        retail: Number(r.retail) || 0,
        specialPrice1: Number(r.specialPrice1) || 0,
        specialPrice2: Number(r.specialPrice2) || 0,
      })),
  });

  const performSave = async () => {
    if (!companyId) return;
    if (!name.trim()) {
      setErrorDialogMessage('Product name is required');
      setErrorDialogOpen(true);
      return;
    }
    if (!unitId) {
      setErrorDialogMessage('Unit is required');
      setErrorDialogOpen(true);
      return;
    }
    setSaving(true);
    try {
      const payload = getUpdatePayload();
      if (editingId) {
        await productApi.update(editingId, companyId, payload);
        setSuccessDialogMessage('Saved');
        setSuccessDialogOpen(true);
      } else {
        await productApi.create(payload);
        handleClear();
        setSuccessDialogMessage('Saved');
        setSuccessDialogOpen(true);
      }
      refreshItemGroups();
      setSaveConfirmOpen(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Save failed';
      setErrorDialogMessage(msg);
      setErrorDialogOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (editingId && !editModeActive) return;
    if (!name.trim()) {
      setErrorDialogMessage('Product name is required');
      setErrorDialogOpen(true);
      return;
    }
    if (!unitId) {
      setErrorDialogMessage('Unit is required');
      setErrorDialogOpen(true);
      return;
    }
    setSaveConfirmOpen(true);
  };

  const handleEditClick = () => {
    if (!editingId) return;
    setEditConfirmOpen(true);
  };
  const handleEditConfirm = async () => {
    if (!editingId || !companyId) return;
    if (!name.trim()) {
      setErrorDialogMessage('Product name is required');
      setErrorDialogOpen(true);
      return;
    }
    if (!unitId) {
      setErrorDialogMessage('Unit is required');
      setErrorDialogOpen(true);
      return;
    }
    setEditConfirmOpen(false);
    setSaving(true);
    try {
      const payload = getUpdatePayload();
      await productApi.update(editingId, companyId, payload);
      refreshItemGroups();
      handleClear();
      setEditedDialogOpen(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Update failed';
      setErrorDialogMessage(msg);
      setErrorDialogOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const handleImageBrowse = () => fileInputRef.current?.click();
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!companyId) {
      setImageError('Select a company first');
      return;
    }
    setImageError(null);
    if (file.size > MAX_IMAGE_SIZE) {
      setImageError('Image size must be 20MB or less');
      return;
    }
    if (!/^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.type)) {
      setImageError('Only image files (JPEG, PNG, GIF, WebP) are allowed');
      return;
    }
    setImageUploading(true);
    productApi.uploadImage(companyId, file)
      .then((res) => {
        const url = (res.data.data as { url: string })?.url;
        if (url) setImageUrl(url);
      })
      .catch((err: { response?: { data?: { message?: string } } }) => {
        setImageError(err?.response?.data?.message ?? 'Upload failed');
      })
      .finally(() => setImageUploading(false));
  };

  const handleDeleteClick = () => {
    if (!editingId) return;
    setDeleteConfirmOpen(true);
  };
  const handleDeleteConfirm = async () => {
    if (!companyId || !editingId) return;
    setDeleteConfirmOpen(false);
    try {
      await productApi.delete(editingId, companyId);
      setSuccessDialogMessage('Deleted');
      setSuccessDialogOpen(true);
      handleClear();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Delete failed';
      setErrorDialogMessage(msg);
      setErrorDialogOpen(true);
    }
  };

  // Change Product Name handlers
  const handleOpenChangeName = () => {
    if (!selectedProduct) return;
    setChangeNameCode(selectedProduct.code || '');
    setChangeNameValue(selectedProduct.name || '');
    setChangeNameDialogOpen(true);
  };

  const handleChangeNameSave = async () => {
    if (!companyId || !editingId || !changeNameValue.trim()) return;
    setChangeNameSaving(true);
    try {
      await productApi.update(editingId, companyId, {
        name: changeNameValue.trim(),
      });
      // Update the local state
      setProductOptions((prev) =>
        prev.map((o) => (o._id === editingId ? { ...o, name: changeNameValue.trim() } : o))
      );
      setSelectedProduct((prev) => prev ? { ...prev, name: changeNameValue.trim() } : null);
      setProductSearch(changeNameValue.trim());
      setName(changeNameValue.trim());
      setChangeNameDialogOpen(false);
      setSuccessDialogMessage('Product name updated');
      setSuccessDialogOpen(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update name';
      setErrorDialogMessage(msg);
      setErrorDialogOpen(true);
    } finally {
      setChangeNameSaving(false);
    }
  };


  if (!companyId) return <Typography color="error">Select a company first.</Typography>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Product Reg</Typography>
      <Paper sx={{ p: 3, maxWidth: 900 }}>
          <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" label="Prod Code" value={code} disabled InputLabelProps={labelShrink} helperText="Auto-generated" />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <Autocomplete
                freeSolo
                disabled={!!selectedProduct}
                options={selectedProduct && !productOptions.some((o) => o._id === selectedProduct._id) ? [selectedProduct, ...productOptions] : productOptions}
                getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt?.name) ?? ''}
                value={selectedProduct != null ? selectedProduct : (productSearch.trim() ? productSearch : null)}
                onChange={(_, newVal) => {
                  if (newVal == null) {
                    setSelectedProduct(null);
                    setProductSearch('');
                    setName('');
                    setEditingId(null);
                    return;
                  }
                  if (typeof newVal === 'string') {
                    setSelectedProduct(null);
                    setProductSearch(newVal);
                    setName(newVal);
                    setEditingId(null);
                    return;
                  }
                  handleProductSelect(_, newVal);
                }}
                onInputChange={(_, v) => {
                  setProductSearch(v ?? '');
                  if (v?.trim()) setName(v.trim());
                  else if (selectedProduct == null) setName('');
                }}
                inputValue={productSearch}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    label="Product Name"
                    InputLabelProps={labelShrink}
                    required={!selectedProduct && !name.trim()}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option._id} style={{ padding: '10px 14px', minHeight: 44 }}>
                    <Box>
                      <Typography variant="body1" fontWeight={500}>{option.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {option.code ?? ''} {option.imei ? ` • IMEI: ${option.imei}` : ''}
                      </Typography>
                    </Box>
                  </li>
                )}
                slotProps={{
                  paper: { sx: { '& .MuiAutocomplete-listbox': { maxHeight: 320 } } },
                }}
                sx={{ flex: 1 }}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={handleOpenChangeName}
                disabled={!selectedProduct}
                sx={{ 
                  minWidth: 'auto', 
                  px: 1, 
                  py: 1,
                  fontSize: '0.7rem',
                  whiteSpace: 'nowrap',
                }}
              >
                Change Name
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" label="IMEI Number" value={imei} onChange={(e) => setImei(e.target.value)} onKeyDown={handleImeiKeyDown} onBlur={handleImeiBlur} InputLabelProps={labelShrink} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-start' }}>
              <Autocomplete
                freeSolo
                options={itemGroup && !itemGroups.includes(itemGroup) ? [itemGroup, ...itemGroups] : itemGroups}
                getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt ?? '')}
                value={itemGroup || null}
                inputValue={itemGroup}
                onInputChange={(_, v) => setItemGroup(v ?? '')}
                onChange={(_, v) => setItemGroup(typeof v === 'string' ? v : v ?? '')}
                renderInput={(params) => (
                  <TextField {...params} size="small" label="Item Group" InputLabelProps={labelShrink} sx={{ flex: 1 }} />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option}>
                    {option}
                  </li>
                )}
                sx={{ flex: 1 }}
              />
              <Button size="small" variant="outlined" onClick={handleOpenItemGroupDialog} sx={{ minWidth: 48, mt: 0.5 }} title="Add item group">+ Add</Button>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-start' }}>
              <Autocomplete
                freeSolo
                options={brand && !brands.includes(brand) ? [brand, ...brands] : brands}
                getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt ?? '')}
                value={brand || null}
                inputValue={brand}
                onInputChange={(_, v) => setBrand(v ?? '')}
                onChange={(_, v) => setBrand(typeof v === 'string' ? v : v ?? '')}
                renderInput={(params) => (
                  <TextField {...params} size="small" label="Brand" InputLabelProps={labelShrink} sx={{ flex: 1 }} />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option}>
                    {option}
                  </li>
                )}
                sx={{ flex: 1 }}
              />
              <Button size="small" variant="outlined" onClick={handleOpenBrandDialog} sx={{ minWidth: 48, mt: 0.5 }} title="Add brand">+ Add</Button>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-start' }}>
              <TextField fullWidth size="small" select label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} InputLabelProps={labelShrink} sx={{ flex: 1 }}>
                <MenuItem value="">—</MenuItem>
                {categories.map((c) => <MenuItem key={c._id} value={c._id}>{c.name} ({c.code})</MenuItem>)}
              </TextField>
              <Button size="small" variant="outlined" onClick={handleOpenCategoryDialog} sx={{ minWidth: 48, mt: 0.5 }} title="Add category">+ Add</Button>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" label="VAT %" value="5" disabled InputLabelProps={labelShrink} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-start' }}>
              <TextField fullWidth size="small" select label="Unit" value={unitId} onChange={(e) => setUnitId(e.target.value)} required InputLabelProps={labelShrink} sx={{ flex: 1 }}>
                <MenuItem value="">Select</MenuItem>
                {units.map((u) => <MenuItem key={u._id} value={u._id}>{u.shortCode}</MenuItem>)}
              </TextField>
              <Button size="small" variant="outlined" onClick={handleOpenUnitDialog} sx={{ minWidth: 48, mt: 0.5 }} title="Add unit">+ Add</Button>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" type="number" label="Retail Price" value={retailPrice} onChange={(e) => setRetailPrice(e.target.value)} InputLabelProps={labelShrink} inputProps={{ step: 0.01, min: 0 }} sx={{ '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 }, '& input[type=number]': { MozAppearance: 'textfield' } }} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" type="number" label="Wholesale Price" value={wholesalePrice} onChange={(e) => setWholesalePrice(e.target.value)} InputLabelProps={labelShrink} inputProps={{ step: 0.01, min: 0 }} sx={{ '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 }, '& input[type=number]': { MozAppearance: 'textfield' } }} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" type="number" label="Special Price" value={specialPrice} onChange={(e) => setSpecialPrice(e.target.value)} InputLabelProps={labelShrink} inputProps={{ step: 0.01, min: 0 }} sx={{ '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 }, '& input[type=number]': { MozAppearance: 'textfield' } }} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" type="number" label="Special Price 2" value={specialPrice2} onChange={(e) => setSpecialPrice2(e.target.value)} InputLabelProps={labelShrink} inputProps={{ step: 0.01, min: 0 }} sx={{ '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 }, '& input[type=number]': { MozAppearance: 'textfield' } }} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" type="number" label="Purchase Rate" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} InputLabelProps={labelShrink} inputProps={{ step: 0.01, min: 0 }} sx={{ '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 }, '& input[type=number]': { MozAppearance: 'textfield' } }} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <DateInput label="Expiry Date" value={expiryDate} onChange={setExpiryDate} size="small" />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Image (max 20MB)</Typography>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
              <Box
                sx={{
                  width: 100,
                  height: 100,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'action.hover',
                }}
              >
                {imagePreviewSrc ? (
                  <img src={imagePreviewSrc} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Typography variant="caption" color="text.secondary">No image</Typography>
                )}
              </Box>
              <Box>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
                <Button size="small" variant="outlined" onClick={handleImageBrowse} disabled={!companyId || imageUploading}>
                  {imageUploading ? 'Uploading…' : 'Browse'}
                </Button>
                {imageError && <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>{imageError}</Typography>}
              </Box>
            </Box>
            </Grid>
            </Grid>

        <Box sx={{ mt: 3, mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="subtitle1">Multi Unit Section</Typography>
          <FormControlLabel
            control={<Checkbox checked={allowBatches} onChange={(e) => { if (!e.target.checked) { setDisableBatchesConfirmOpen(true); } else { setEnableBatchesConfirmOpen(true); } }} size="small" />}
            label={<Typography variant="body2" sx={{ fontSize: '0.85rem' }}>Allow Batches</Typography>}
            sx={{ ml: 0 }}
          />
        </Box>
        {!allowBatches && (
          <>
            {multiUnits.map((row) => (
              <Grid container spacing={1} key={row.id} alignItems="center" sx={{ mb: 1 }}>
                <Grid item xs={12} sm={3}><TextField size="small" fullWidth label="IMEI" value={row.imei} onChange={(e) => updateMultiUnit(row.id, 'imei', e.target.value)} /></Grid>
                <Grid item xs={12} sm={2}><TextField size="small" fullWidth type="number" label="Pcs Inside" value={row.conversion} onChange={(e) => updateMultiUnit(row.id, 'conversion', e.target.value)} sx={{ '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 }, '& input[type=number]': { MozAppearance: 'textfield' } }} /></Grid>
                <Grid item xs={12} sm={2}><TextField size="small" select fullWidth label="Unit" value={row.unitId} onChange={(e) => updateMultiUnit(row.id, 'unitId', e.target.value)}>{units.map((u) => <MenuItem key={u._id} value={u._id}>{u.shortCode}</MenuItem>)}</TextField></Grid>
                <Grid item xs={12} sm={1.5}>
                  <Button size="small" variant="outlined" startIcon={<LocalOfferIcon sx={{ fontSize: '0.9rem' }} />} onClick={() => setPricesDialogRowId(row.id)} sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.4, px: 1, borderColor: '#7c3aed', color: '#7c3aed', '&:hover': { bgcolor: '#f5f3ff', borderColor: '#6d28d9' } }}>Prices</Button>
                </Grid>
                <Grid item xs={12} sm={0.5}><IconButton size="small" onClick={() => removeMultiUnitRow(row.id)}><DeleteOutlineIcon /></IconButton></Grid>
              </Grid>
            ))}
            <Button startIcon={<AddIcon />} size="small" onClick={addMultiUnitRow} sx={{ mb: 2 }}>Add Multi Unit</Button>
          </>
        )}

        <Box sx={{ mt: 3, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button 
            variant="contained" 
            onClick={handleSave} 
            disabled={saving || (!!editingId && !editModeActive)}
            startIcon={<SaveIcon />}
            sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' }, minWidth: 110, py: 1, fontSize: '0.9rem' }}
          >
            SAVE
          </Button>
          <Button 
            variant="contained" 
            onClick={handleEditClick}
            disabled={!editingId || saving}
            startIcon={<EditIcon />}
            sx={{ bgcolor: '#607d8b', '&:hover': { bgcolor: '#546e7a' }, minWidth: 110, py: 1, fontSize: '0.9rem' }}
          >
            EDIT
          </Button>
          <Button 
            variant="contained" 
            onClick={handleDeleteClick}
            disabled={!editingId || saving}
            startIcon={<DeleteIcon />}
            sx={{ bgcolor: '#f44336', '&:hover': { bgcolor: '#d32f2f' }, minWidth: 110, py: 1, fontSize: '0.9rem' }}
          >
            DELETE
          </Button>
          <Button 
            variant="contained" 
            onClick={handleClear}
            startIcon={<ClearIcon />}
            sx={{ bgcolor: '#00bcd4', '&:hover': { bgcolor: '#00acc1' }, minWidth: 110, py: 1, fontSize: '0.9rem' }}
          >
            CLEAR
          </Button>
          <Button 
            variant="contained"
            onClick={() => navigate('/master/products')}
            sx={{ bgcolor: '#607d8b', '&:hover': { bgcolor: '#546e7a' }, minWidth: 110, py: 1, fontSize: '0.9rem' }}
          >
            CANCEL
          </Button>
        </Box>
      </Paper>

      {/* Disable Batches Confirmation Dialog */}
      <Dialog open={disableBatchesConfirmOpen} onClose={() => setDisableBatchesConfirmOpen(false)} PaperProps={{ sx: { borderRadius: 2, maxWidth: 420 } }}>
        <DialogTitle sx={{ fontWeight: 600, color: '#d97706', fontSize: '1rem' }}>Disable Batches?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#475569' }}>
            If you disable batches, this product's current batches will be merged and batch-wise tracking will no longer be available. This action will take effect when you save.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDisableBatchesConfirmOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={() => { setAllowBatches(false); setDisableBatchesConfirmOpen(false); }} autoFocus sx={{ textTransform: 'none', bgcolor: '#d97706', '&:hover': { bgcolor: '#b45309' } }}>Yes, Disable</Button>
        </DialogActions>
      </Dialog>

      {/* Enable Batches Confirmation Dialog */}
      <Dialog open={enableBatchesConfirmOpen} onClose={() => setEnableBatchesConfirmOpen(false)} PaperProps={{ sx: { borderRadius: 2, maxWidth: 420 } }}>
        <DialogTitle sx={{ fontWeight: 600, color: '#2563eb', fontSize: '1rem' }}>Enable Batches?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#475569' }}>
            If you enable batches, the multi-unit option will no longer be available for this product. Existing multi-units will be removed when you save.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEnableBatchesConfirmOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={() => { setAllowBatches(true); setMultiUnits([]); setEnableBatchesConfirmOpen(false); }} autoFocus sx={{ textTransform: 'none', bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' } }}>Yes, Enable</Button>
        </DialogActions>
      </Dialog>

      {/* Multi-Unit Prices Dialog */}
      <Dialog open={!!pricesDialogRowId} onClose={() => setPricesDialogRowId(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 600, color: '#7c3aed', pb: 0.5, fontSize: '1rem' }}>
          Multi-Unit Prices
          {pricesDialogRowId && (() => {
            const row = multiUnits.find((r) => r.id === pricesDialogRowId);
            const unitName = units.find((u) => u._id === row?.unitId)?.shortCode;
            return row ? <Typography variant="caption" sx={{ display: 'block', color: '#64748b', fontSize: '0.75rem' }}>IMEI: {row.imei || '—'} | Unit: {unitName || '—'}</Typography> : null;
          })()}
        </DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          {pricesDialogRowId && (() => {
            const row = multiUnits.find((r) => r.id === pricesDialogRowId);
            if (!row) return null;
            const numStyle = { '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 }, '& input[type=number]': { MozAppearance: 'textfield' } };
            return (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <TextField size="small" fullWidth type="number" label="Wholesale Price" value={row.wholesale} onChange={(e) => updateMultiUnit(row.id, 'wholesale', e.target.value)} InputLabelProps={labelShrink} sx={numStyle} />
                <TextField size="small" fullWidth type="number" label="Retail Price" value={row.retail} onChange={(e) => updateMultiUnit(row.id, 'retail', e.target.value)} InputLabelProps={labelShrink} sx={numStyle} />
                <TextField size="small" fullWidth type="number" label="Special Price 1" value={row.specialPrice1} onChange={(e) => updateMultiUnit(row.id, 'specialPrice1', e.target.value)} InputLabelProps={labelShrink} sx={numStyle} />
                <TextField size="small" fullWidth type="number" label="Special Price 2" value={row.specialPrice2} onChange={(e) => updateMultiUnit(row.id, 'specialPrice2', e.target.value)} InputLabelProps={labelShrink} sx={numStyle} />
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPricesDialogRowId(null)} variant="contained" size="small" autoFocus sx={{ bgcolor: '#7c3aed', textTransform: 'none', '&:hover': { bgcolor: '#6d28d9' } }}>Done</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Category</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth margin="dense" label="Name" value={categoryDialogName} onChange={(e) => setCategoryDialogName(e.target.value)} InputLabelProps={labelShrink} required />
          <TextField fullWidth margin="dense" label="Code" value={categoryDialogCode} onChange={(e) => setCategoryDialogCode(e.target.value)} InputLabelProps={labelShrink} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveCategory} disabled={savingCategory || !categoryDialogName.trim()} autoFocus>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={unitDialogOpen} onClose={() => setUnitDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Unit</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth margin="dense" label="Name" value={unitDialogName} onChange={(e) => setUnitDialogName(e.target.value)} InputLabelProps={labelShrink} required />
          <TextField fullWidth margin="dense" label="Short Code" value={unitDialogShortCode} onChange={(e) => setUnitDialogShortCode(e.target.value)} InputLabelProps={labelShrink} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnitDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveUnit} disabled={savingUnit || !unitDialogName.trim()} autoFocus>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={itemGroupDialogOpen} onClose={() => setItemGroupDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Item Group</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth margin="dense" label="Item Group Name" value={itemGroupDialogName} onChange={(e) => setItemGroupDialogName(e.target.value)} InputLabelProps={labelShrink} required />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemGroupDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveItemGroup} disabled={!itemGroupDialogName.trim()} autoFocus>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={brandDialogOpen} onClose={() => setBrandDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Brand</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth margin="dense" label="Brand Name" value={brandDialogName} onChange={(e) => setBrandDialogName(e.target.value)} InputLabelProps={labelShrink} required />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBrandDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveBrand} disabled={!brandDialogName.trim()} autoFocus>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={saveConfirmOpen} onClose={() => !saving && setSaveConfirmOpen(false)}>
        <DialogTitle>Save product?</DialogTitle>
        <DialogContent>Do you want to save the product details?</DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveConfirmOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={performSave} disabled={saving} autoFocus>OK</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editConfirmOpen} onClose={() => setEditConfirmOpen(false)}>
        <DialogTitle>Edit</DialogTitle>
        <DialogContent>Do you want to edit?</DialogContent>
        <DialogActions>
          <Button onClick={() => setEditConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditConfirm} autoFocus>OK</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editedDialogOpen} onClose={() => setEditedDialogOpen(false)}>
        <DialogTitle>Edited</DialogTitle>
        <DialogContent>Product has been edited successfully.</DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setEditedDialogOpen(false)} autoFocus>OK</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete product?</DialogTitle>
        <DialogContent>Are you sure you want to delete this product? The product cannot be deleted if it has transactions.</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm} autoFocus>OK</Button>
        </DialogActions>
      </Dialog>

      {/* Change Product Name Dialog */}
      <Dialog open={changeNameDialogOpen} onClose={() => setChangeNameDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Change Product Name</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            size="small"
            label="Product Code"
            value={changeNameCode}
            disabled
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            size="small"
            label="Product Name"
            value={changeNameValue}
            onChange={(e) => setChangeNameValue(e.target.value)}
            margin="normal"
            required
            autoFocus
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangeNameDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleChangeNameSave}
            disabled={changeNameSaving || !changeNameValue.trim()}
            autoFocus
          >
            {changeNameSaving ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onClose={() => setSuccessDialogOpen(false)} PaperProps={{ sx: { borderRadius: 2, minWidth: 350 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', color: '#15803d' }}>Success</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.9rem', color: '#475569' }}>{successDialogMessage}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button variant="contained" onClick={() => setSuccessDialogOpen(false)} autoFocus sx={{ textTransform: 'none', borderRadius: 1.5, bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, boxShadow: 'none' }}>OK</Button>
        </DialogActions>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={errorDialogOpen} onClose={() => setErrorDialogOpen(false)} PaperProps={{ sx: { borderRadius: 2, minWidth: 350 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', color: '#dc2626' }}>Error</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.9rem', color: '#475569' }}>{errorDialogMessage}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button variant="contained" onClick={() => setErrorDialogOpen(false)} autoFocus sx={{ textTransform: 'none', borderRadius: 1.5, bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' }, boxShadow: 'none' }}>OK</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

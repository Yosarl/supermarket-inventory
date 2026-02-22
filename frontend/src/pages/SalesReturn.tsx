import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Grid, IconButton,
  Autocomplete, createFilterOptions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, RadioGroup, FormControlLabel, Radio,
  MenuItem, Checkbox, FormControlLabel as MuiFormControlLabel, Divider,
} from '@mui/material';
import {
  Save as SaveIcon,
  Clear as ClearIcon,
  Delete as DeleteIcon,
  Print as PrintIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  FirstPage as FirstIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  LastPage as LastIcon,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { salesApi, ledgerAccountApi, productApi, purchaseApi, stockApi } from '../services/api';
import DateInput, { getCurrentDate } from '../components/DateInput';
import { setDrawerOpen } from '../store/slices/appSlice';

function parseNumericInput(raw: string | number): number {
  if (typeof raw === 'number' && !Number.isNaN(raw)) return raw;
  const s = String(raw ?? '').trim();
  if (s === '') return 0;
  const n = parseFloat(s.replace(/,/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

interface ProductOption {
  _id: string;
  name: string;
  code?: string;
  purchasePrice?: number;
  unitId?: string;
  unitName?: string;
  allowBatches?: boolean;
  imei?: string;
  multiUnits?: Array<{ imei?: string; unitId?: string; conversion?: number }>;
}

interface UnitOption {
  id: string;
  name: string;
}

interface LineItem {
  id: string;
  productId: string;
  productCode: string;
  imei: string;
  name: string;
  unitId: string;
  unitName: string;
  availableUnits: UnitOption[];
  quantity: number;
  price: number;
  purchasePrice: number;
  gross: number;
  discPercent: number;
  discAmount: number;
  vatAmount: number;
  total: number;
  batchNumber?: string;
}

interface Customer {
  _id: string;
  name: string;
  code?: string;
  address?: string;
  phone?: string;
}

interface RefInvoiceItem {
  _id: string;
  productId: { _id: string; name?: string; code?: string };
  productCode?: string;
  imei?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  totalAmount: number;
  unitName?: string;
  batchNumber?: string;
}

const emptyLine = (): LineItem => ({
  id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
  productId: '', productCode: '', imei: '', name: '',
  unitId: '', unitName: '', availableUnits: [],
  quantity: 0, price: 0, purchasePrice: 0, gross: 0,
  discPercent: 0, discAmount: 0, vatAmount: 0, total: 0,
});

export default function SalesReturn() {
  const companyId = useSelector((s: RootState) => s.app.selectedCompanyId);
  const financialYearId = useSelector((s: RootState) => s.app.selectedFinancialYearId);
  const dispatch = useDispatch();

  const [invoiceNo, setInvoiceNo] = useState('');
  const [date, setDate] = useState(getCurrentDate());
  const [taxMode, setTaxMode] = useState<'inclusive' | 'exclusive'>('exclusive');
  const [vatType, setVatType] = useState<'Vat' | 'NonVat'>('Vat');
  const [paymentType, setPaymentType] = useState<'Cash' | 'Credit'>('Cash');
  const [returnType, setReturnType] = useState<'OnAccount' | 'ByRef'>('OnAccount');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('CASH');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cashAccountId, setCashAccountId] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [otherDiscPercent, setOtherDiscPercent] = useState(0);
  const [otherDiscount, setOtherDiscount] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [freightCharge, setFreightCharge] = useState(0);
  const [lendAddLess, setLendAddLess] = useState(0);
  const [roundOff, setRoundOff] = useState(0);
  const [narration, setNarration] = useState('');
  const [loading, setLoading] = useState(false);
  const [returnId, setReturnId] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);
  const [editSuccessDialogOpen, setEditSuccessDialogOpen] = useState(false);
  const [searchInvoiceNo, setSearchInvoiceNo] = useState('');
  const [searchError, setSearchError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [savedDialogOpen, setSavedDialogOpen] = useState(false);
  const [savedDialogMessage, setSavedDialogMessage] = useState('');
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDialogMessage, setErrorDialogMessage] = useState('');
  const [editingNumericCell, setEditingNumericCell] = useState<{ lineId?: string; field: string; value: string } | null>(null);
  const [invoiceList, setInvoiceList] = useState<Array<{ _id: string; invoiceNo: string; date: string; customerName?: string; totalAmount?: number }>>([]);
  const [currentNavIndex, setCurrentNavIndex] = useState<number>(-1);
  const [, setSalesAccountName] = useState<string>('');
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [focusedBatchIndex, setFocusedBatchIndex] = useState(0);
  const [availableBatches, setAvailableBatches] = useState<{
    batchNumber: string;
    productId: string;
    productName: string;
    purchasePrice: number;
    expiryDate: string;
    quantity: number;
    retail: number;
    wholesale: number;
  }[]>([]);
  const [pendingProductSelection, setPendingProductSelection] = useState<{
    lineId: string;
    product: ProductOption;
  } | null>(null);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [selectedProductInfo, setSelectedProductInfo] = useState<{
    profit?: number;
    purchaseRate: number;
    lastVendor?: string;
    stock?: number;
    retailPrice?: number;
    wholesalePrice?: number;
    batchNumber?: string;
    expiryDate?: string;
  } | null>(null);
  const batchRowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const rowSnapshotRef = useRef<{ lineId: string; data: LineItem } | null>(null);
  const rowCommittedRef = useRef(false);
  const itemNameSnapshotRef = useRef<{ lineId: string; data: LineItem } | null>(null);

  const handleTextFieldFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.select();
  };

  const productFilterOptions = useMemo(
    () => createFilterOptions<ProductOption>({ matchFrom: 'any', stringify: (opt) => opt.name || '' }),
    []
  );

  const VAT_RATE = 5;
  const calcVatAndTotal = useCallback(
    (net: number, isVat: boolean) => {
      if (!isVat) return { vatAmount: 0, total: parseFloat(net.toFixed(2)) };
      if (taxMode === 'inclusive') {
        const vatAmount = parseFloat((net * VAT_RATE / (100 + VAT_RATE)).toFixed(2));
        return { vatAmount, total: parseFloat(net.toFixed(2)) };
      }
      const vatAmount = parseFloat((net * (VAT_RATE / 100)).toFixed(2));
      return { vatAmount, total: parseFloat((net + vatAmount).toFixed(2)) };
    },
    [taxMode]
  );

  const revertUncommittedRow = useCallback(() => {
    if (rowSnapshotRef.current && !rowCommittedRef.current) {
      const snapshot = rowSnapshotRef.current;
      setLines((prev) =>
        prev.map((l) => (l.id === snapshot.lineId ? { ...snapshot.data } : l))
      );
    }
    rowSnapshotRef.current = null;
    rowCommittedRef.current = false;
  }, []);

  const enterRow = useCallback((line: LineItem) => {
    if (rowSnapshotRef.current && rowSnapshotRef.current.lineId === line.id) return;
    revertUncommittedRow();
    if (line.productId) {
      rowSnapshotRef.current = {
        lineId: line.id,
        data: { ...line, availableUnits: [...line.availableUnits] },
      };
      rowCommittedRef.current = false;
    }
  }, [revertUncommittedRow]);

  const handleRowClick = useCallback((line: LineItem, event?: React.MouseEvent<HTMLTableRowElement>) => {
    const target = event?.target as HTMLElement | null;
    // Keep row-click quick-focus behavior, but do not steal focus when user clicks any editable control.
    if (
      target?.closest(
        'input, textarea, button, [role="button"], [role="combobox"], .MuiInputBase-root, .MuiAutocomplete-root'
      )
    ) {
      return;
    }
    enterRow(line);
    setActiveLineId(line.id);
    setTimeout(() => imeiInputRefs.current[line.id]?.focus(), 50);
  }, [enterRow]);

  // Sync Product Info from active line (same idea as Sales B2C)
  useEffect(() => {
    if (!activeLineId) {
      setSelectedProductInfo(null);
      return;
    }
    const line = lines.find((l) => l.id === activeLineId);
    if (!line || !line.productId) {
      setSelectedProductInfo(null);
      return;
    }
    const product = products.find((p) => p._id === line.productId);
    const profit = line.price - line.purchasePrice;
    setSelectedProductInfo({
      profit,
      purchaseRate: line.purchasePrice,
      lastVendor: (product as { lastVendor?: string } | undefined)?.lastVendor ?? '-',
      batchNumber: line.batchNumber,
      retailPrice: line.price,
    });
    if (companyId && line.productId) {
      stockApi.getProductStock(companyId, line.productId)
        .then((res) => {
          const stock = (res.data.data as { stock?: number })?.stock;
          setSelectedProductInfo((prev) => (prev ? { ...prev, stock } : null));
        })
        .catch(() => {
          setSelectedProductInfo((prev) => (prev ? { ...prev, stock: undefined } : null));
        });
    }
  }, [activeLineId, lines, products, companyId]);

  const handleGridArrowNavigation = useCallback((
    e: React.KeyboardEvent,
    lineId: string,
    fieldRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>
  ) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const currentIndex = lines.findIndex((l) => l.id === lineId);
    if (currentIndex === -1) return;
    const targetIndex = e.key === 'ArrowUp'
      ? (currentIndex > 0 ? currentIndex - 1 : currentIndex)
      : (currentIndex < lines.length - 1 ? currentIndex + 1 : currentIndex);
    if (targetIndex === currentIndex) return;
    const targetLine = lines[targetIndex];
    enterRow(targetLine);
    setActiveLineId(targetLine.id);
    const targetInput = fieldRefs.current[targetLine.id];
    if (targetInput) {
      targetInput.focus();
      targetInput.select();
    }
  }, [lines, enterRow]);

  const handleNumberKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      return;
    }
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', '-', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (allowedKeys.includes(e.key) || (e.ctrlKey && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase()))) return;
    const input = e.target as HTMLInputElement;
    const value = input.value;
    const selStart = input.selectionStart ?? value.length;
    const selEnd = input.selectionEnd ?? value.length;
    if (e.key === '.') {
      if (value.includes('.')) e.preventDefault();
      return;
    }
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      return;
    }
    const dotIndex = value.indexOf('.');
    if (dotIndex !== -1 && selStart === selEnd) {
      const decimals = value.substring(dotIndex + 1);
      if (decimals.length >= 2 && selStart > dotIndex) e.preventDefault();
    }
  }, []);

  useEffect(() => {
    if (batchDialogOpen && batchRowRefs.current[focusedBatchIndex]) {
      batchRowRefs.current[focusedBatchIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [batchDialogOpen, focusedBatchIndex]);

  const customerAcRef = useRef<HTMLInputElement>(null);
  const customerNameRef = useRef<HTMLInputElement>(null);
  const taxModeRef = useRef<HTMLInputElement>(null);
  const returnTypeRef = useRef<HTMLInputElement>(null);
  const refInvoiceNoRef = useRef<HTMLInputElement>(null);
  const narrationRef = useRef<HTMLInputElement>(null);
  const imeiInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const itemNameInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const qtyInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const priceInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const discPercentInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const discAmountInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const unitInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const numberInputStyle = {
    '& input[type=number]': { MozAppearance: 'textfield' as const },
    '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
      WebkitAppearance: 'none' as const,
      margin: 0,
    },
  };

  // By Ref: dialogs
  const [refInvoiceNoInput, setRefInvoiceNoInput] = useState('');
  const [refInvoiceLoading, setRefInvoiceLoading] = useState(false);
  const [refInvoiceError, setRefInvoiceError] = useState('');
  const [refInvoiceData, setRefInvoiceData] = useState<{
    _id: string;
    invoiceNo: string;
    customerId?: string;
    customerName?: string;
    customerAddress?: string;
    customerPhone?: string;
    vatType?: string;
    taxMode?: 'inclusive' | 'exclusive';
    items: RefInvoiceItem[];
    totalAmount: number;
  } | null>(null);
  const [originalInvoiceIdForReturn, setOriginalInvoiceIdForReturn] = useState<string | null>(null);
  const [selectItemsDialogOpen, setSelectItemsDialogOpen] = useState(false);
  const [selectedRefItemIds, setSelectedRefItemIds] = useState<Set<string>>(new Set());

  const loadNextInvoiceNo = useCallback(async () => {
    if (!companyId || !financialYearId) return;
    try {
      const res = await salesApi.getNextReturnInvoiceNo(companyId, financialYearId);
      setInvoiceNo(res.data.data.invoiceNo);
    } catch {
      setInvoiceNo('SR-000001');
    }
  }, [companyId, financialYearId]);

  useEffect(() => {
    loadNextInvoiceNo();
  }, [loadNextInvoiceNo]);

  const loadInvoiceList = useCallback(async () => {
    if (!companyId || !financialYearId) return;
    try {
      const res = await salesApi.listSalesReturns(companyId, financialYearId);
      setInvoiceList(Array.isArray(res.data.data) ? res.data.data : []);
    } catch {
      setInvoiceList([]);
    }
  }, [companyId, financialYearId]);

  useEffect(() => {
    loadInvoiceList();
  }, [loadInvoiceList]);

  const loadInvoiceIntoForm = useCallback(async (id: string) => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await salesApi.getSalesReturn(id, companyId);
      const data = res.data.data as {
        _id: string; invoiceNo: string; date: string; returnType: string;
        originalInvoiceId?: string;
        customerId?: string; customerName?: string; customerAddress?: string; cashAccountId?: string;
        cashAccountName?: string; salesAccountName?: string;
        vatType?: string; taxMode?: string; items: Array<{
          productId: string | { _id: string; name?: string };
          productCode?: string; imei?: string; description?: string;
          quantity: number; unitPrice: number; discount?: number; totalAmount?: number;
          unitName?: string; unitId?: string; batchNumber?: string;
        }>;
        otherDiscount?: number; otherCharges?: number; freightCharge?: number; lendAddLess?: number; roundOff?: number; narration?: string;
      };
      setReturnId(data._id);
      setInvoiceNo(data.invoiceNo);
      setDate(data.date ? new Date(data.date).toISOString().slice(0, 10) : getCurrentDate());
      setReturnType((data.returnType || 'OnAccount') as 'OnAccount' | 'ByRef');
      setOriginalInvoiceIdForReturn(data.originalInvoiceId ?? null);
      setCustomerId(data.customerId ?? null);
      setCustomerName(data.customerName ?? 'CASH');
      setCustomerAddress(data.customerAddress ?? '');
      setVatType((data.vatType as 'Vat' | 'NonVat') || 'Vat');
      setTaxMode((data.taxMode as 'inclusive' | 'exclusive') ?? 'exclusive');
      setOtherDiscount(data.otherDiscount ?? 0);
      setOtherCharges(data.otherCharges ?? 0);
      setFreightCharge(data.freightCharge ?? 0);
      setLendAddLess(data.lendAddLess ?? 0);
      setRoundOff(data.roundOff ?? 0);
      setNarration(data.narration ?? '');
      setSalesAccountName(data.salesAccountName ?? data.cashAccountName ?? '');
      if (data.cashAccountId) setCashAccountId(data.cashAccountId);
      const loadedTaxMode = (data.taxMode as 'inclusive' | 'exclusive') || 'exclusive';
      const isVatLoad = data.vatType !== 'NonVat';
      const newLines: LineItem[] = (data.items || []).map((it, idx) => {
        const pid = typeof it.productId === 'object' && it.productId !== null ? (it.productId as { _id: string })._id : String(it.productId);
        const name = typeof it.productId === 'object' && (it.productId as { name?: string }).name ? (it.productId as { name: string }).name : (it.description || '');
        const price = it.unitPrice ?? 0;
        const qty = it.quantity ?? 0;
        const disc = it.discount ?? 0;
        const gross = qty * price;
        const net = gross - disc;
        let vatAmount: number;
        let lineTotal: number;
        if (isVatLoad && loadedTaxMode === 'inclusive') {
          vatAmount = parseFloat((net * 5 / (100 + 5)).toFixed(2));
          lineTotal = parseFloat(net.toFixed(2));
        } else if (isVatLoad) {
          vatAmount = parseFloat((net * 0.05).toFixed(2));
          lineTotal = parseFloat((net + vatAmount).toFixed(2));
        } else {
          vatAmount = 0;
          lineTotal = parseFloat(net.toFixed(2));
        }
        const uname = (it.unitName as string) || 'Pcs';
        const uid = (it.unitId as string) || (it as { unitId?: string }).unitId || 'pcs';
        const availableUnits: UnitOption[] = [{ id: uid, name: uname }];
        const itWithImei = it as { imei?: string };
        return {
          id: `loaded-${idx}-${Date.now()}`,
          productId: pid,
          productCode: (it.productCode as string) || '',
          imei: itWithImei.imei || '',
          name: name || '',
          unitId: uid,
          unitName: uname,
          availableUnits,
          quantity: qty,
          price,
          purchasePrice: 0,
          gross,
          discPercent: 0,
          discAmount: disc,
          vatAmount,
          total: lineTotal,
          batchNumber: it.batchNumber,
        };
      });
      setLines(newLines.length > 0 ? newLines : [emptyLine()]);
      setActiveLineId(null);
      const idx = invoiceList.findIndex((i) => i._id === id);
      if (idx >= 0) setCurrentNavIndex(idx);
    } catch {
      setErrorDialogMessage('Failed to load sales return');
      setErrorDialogOpen(true);
    } finally {
      setLoading(false);
    }
  }, [companyId, invoiceList]);

  const navFirst = useCallback(() => {
    if (invoiceList.length === 0) return;
    loadInvoiceIntoForm(invoiceList[0]._id);
  }, [invoiceList, loadInvoiceIntoForm]);

  const navPrev = useCallback(() => {
    if (invoiceList.length === 0) return;
    if (currentNavIndex < 0) {
      loadInvoiceIntoForm(invoiceList[invoiceList.length - 1]._id);
      return;
    }
    const idx = currentNavIndex > 0 ? currentNavIndex - 1 : 0;
    loadInvoiceIntoForm(invoiceList[idx]._id);
  }, [invoiceList, currentNavIndex, loadInvoiceIntoForm]);

  const navNext = useCallback(() => {
    if (invoiceList.length === 0) return;
    const idx = currentNavIndex < invoiceList.length - 1 ? currentNavIndex + 1 : invoiceList.length - 1;
    loadInvoiceIntoForm(invoiceList[idx]._id);
  }, [invoiceList, currentNavIndex, loadInvoiceIntoForm]);

  const navLast = useCallback(() => {
    if (invoiceList.length === 0) return;
    loadInvoiceIntoForm(invoiceList[invoiceList.length - 1]._id);
  }, [invoiceList, loadInvoiceIntoForm]);

  useEffect(() => {
    if (!companyId) return;
    const cashOption = { _id: 'cash', code: 'CASH', name: 'CASH', address: '' };
    ledgerAccountApi.list(companyId, 'Customer').then((res) => {
      const list = (res.data.data ?? []) as Customer[];
      setCustomers([cashOption, ...(Array.isArray(list) ? list : [])]);
    }).catch(() => setCustomers([cashOption]));
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    ledgerAccountApi.list(companyId, 'Cash').then((res) => {
      const list = (res.data.data ?? []) as { _id: string; name?: string }[];
      if (Array.isArray(list) && list.length > 0) {
        setCashAccountId(list[0]._id);
      }
    }).catch(() => {});
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    productApi.list(companyId, { limit: 10000 }).then((res) => {
      const d = res.data?.data as { products?: ProductOption[] };
      const list = d?.products ?? [];
      setProducts(Array.isArray(list) ? list : []);
    }).catch(() => setProducts([]));
  }, [companyId]);

  const fetchRefInvoice = useCallback(async () => {
    if (!companyId || !refInvoiceNoInput.trim()) {
      setRefInvoiceError('Enter sales invoice number');
      return;
    }
    setRefInvoiceError('');
    setRefInvoiceLoading(true);
    try {
      const res = await salesApi.searchB2CByInvoiceNo(companyId, refInvoiceNoInput.trim());
      const data = res.data.data as typeof refInvoiceData;
      if (!data || !data.items?.length) {
        setRefInvoiceError('Invoice not found or has no items');
        return;
      }
      setRefInvoiceData(data);
      setRefInvoiceNoInput('');
      setSelectItemsDialogOpen(true);
      setSelectedRefItemIds(new Set(data.items.map((i: RefInvoiceItem) => i._id)));
    } catch (e: unknown) {
      setRefInvoiceError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Invoice not found');
    } finally {
      setRefInvoiceLoading(false);
    }
  }, [companyId, refInvoiceNoInput]);

  const confirmSelectRefItems = useCallback(() => {
    if (!refInvoiceData) return;
    const selected = refInvoiceData.items.filter((i) => selectedRefItemIds.has(i._id));
    if (selected.length === 0) {
      setErrorDialogMessage('Select at least one item');
      setErrorDialogOpen(true);
      return;
    }
    const refTaxMode = (refInvoiceData.taxMode as 'inclusive' | 'exclusive') || 'exclusive';
    const refIsVat = refInvoiceData.vatType !== 'NonVat';
    const newLines: LineItem[] = selected.map((it, idx) => {
      const pid = typeof it.productId === 'object' ? (it.productId as { _id: string })._id : String(it.productId);
      const name = typeof it.productId === 'object' && (it.productId as { name?: string }).name ? (it.productId as { name: string }).name : (it.description || '');
      const price = it.unitPrice ?? 0;
      const qty = it.quantity ?? 0;
      const disc = it.discount ?? 0;
      const gross = qty * price;
      const net = gross - disc;
      let vatAmount: number;
      let lineTotal: number;
      if (refIsVat && refTaxMode === 'inclusive') {
        vatAmount = parseFloat((net * 5 / (100 + 5)).toFixed(2));
        lineTotal = parseFloat(net.toFixed(2));
      } else if (refIsVat) {
        vatAmount = parseFloat((net * 0.05).toFixed(2));
        lineTotal = parseFloat((net + vatAmount).toFixed(2));
      } else {
        vatAmount = 0;
        lineTotal = parseFloat(net.toFixed(2));
      }
      const uname = (it.unitName as string) || 'Pcs';
      const uid = (it as { unitId?: string }).unitId || 'pcs';
      const availableUnits: UnitOption[] = [{ id: uid, name: uname }];
      const itWithImei = it as { imei?: string };
      return {
        id: `ref-${idx}-${Date.now()}`,
        productId: pid,
        productCode: (it.productCode as string) || '',
        imei: itWithImei.imei || '',
        name: name || '',
        unitId: uid,
        unitName: uname,
        availableUnits,
        quantity: qty,
        price,
        purchasePrice: 0,
        gross,
        discPercent: 0,
        discAmount: disc,
        vatAmount,
        total: lineTotal,
        batchNumber: it.batchNumber ?? '',
      };
    });
    setLines(newLines.length > 0 ? newLines : [emptyLine()]);
    setCustomerId(refInvoiceData.customerId ?? null);
    setCustomerName(refInvoiceData.customerName ?? '');
    setCustomerAddress(refInvoiceData.customerAddress ?? '');
    setVatType((refInvoiceData.vatType as 'Vat' | 'NonVat') || 'Vat');
    setTaxMode(refTaxMode);
    setOriginalInvoiceIdForReturn(refInvoiceData._id);
    setSelectItemsDialogOpen(false);
    setRefInvoiceData(null);
  }, [refInvoiceData, selectedRefItemIds]);

  useEffect(() => {
    setLines((prev) =>
      prev.map((line) => {
        if (!line.productId) return line;
        const net = parseFloat((line.gross - line.discAmount).toFixed(2));
        const vt = calcVatAndTotal(net, vatType === 'Vat');
        return { ...line, vatAmount: vt.vatAmount, total: vt.total };
      })
    );
  }, [taxMode, vatType, calcVatAndTotal]);

  const clearLineProduct = useCallback((lineId: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        return {
          ...l,
          name: '',
          productId: '',
          productCode: '',
          imei: '',
          unitId: '',
          unitName: '',
          availableUnits: [],
          quantity: 0,
          price: 0,
          purchasePrice: 0,
          gross: 0,
          discPercent: 0,
          discAmount: 0,
          vatAmount: 0,
          total: 0,
          batchNumber: undefined,
        };
      })
    );
  }, []);

  const handleItemNameFocus = useCallback((line: LineItem) => {
    itemNameSnapshotRef.current = { lineId: line.id, data: { ...line } };
  }, []);

  const handleItemNameBlur = useCallback((line: LineItem) => {
    const snap = itemNameSnapshotRef.current;
    if (snap && snap.lineId === line.id && snap.data.productId && !line.productId) {
      setLines((prev) =>
        prev.map((l) => (l.id === line.id ? { ...l, ...snap.data } : l))
      );
    }
    itemNameSnapshotRef.current = null;
  }, []);

  const updateLine = useCallback((id: string, field: keyof LineItem, value: unknown) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;
        const updated = { ...line, [field]: value };
        if (['quantity', 'price', 'discPercent', 'discAmount'].includes(field)) {
          const gross = updated.quantity * updated.price;
          const disc = field === 'discPercent' ? (gross * (Number(updated.discPercent) / 100)) : Number(updated.discAmount);
          updated.discAmount = disc;
          updated.discPercent = gross > 0 ? (disc / gross) * 100 : 0;
          updated.gross = gross;
          const net = gross - disc;
          const vt = calcVatAndTotal(net, vatType === 'Vat');
          updated.vatAmount = vt.vatAmount;
          updated.total = vt.total;
        }
        return updated;
      })
    );
  }, [vatType, calcVatAndTotal]);

  const removeLine = useCallback((id: string) => {
    if (rowSnapshotRef.current?.lineId === id) {
      rowSnapshotRef.current = null;
      rowCommittedRef.current = false;
    }
    setLines((prev) => {
      const filtered = prev.filter((l) => l.id !== id);
      return filtered.length > 0 ? filtered : [emptyLine()];
    });
    setSelectedProductInfo(null);
    setActiveLineId(null);
  }, []);

  const getBatchesForProduct = useCallback(async (productId: string) => {
    try {
      if (!companyId) return [];
      const res = await purchaseApi.getProductBatches(companyId, productId);
      return res.data.data || [];
    } catch {
      return [];
    }
  }, [companyId]);

  const completeProductSelection = useCallback((lineId: string, product: ProductOption, selectedBatch?: typeof availableBatches[0]) => {
    const price = selectedBatch?.retail ?? (product as { retail?: number }).retail ?? product.purchasePrice ?? 0;
    const uid = product.unitId ?? 'pcs';
    const uname = product.unitName ?? 'Pcs';
    const availableUnits: UnitOption[] = [{ id: uid, name: uname }];
    const imei = product.imei ?? '';
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        const gross = line.quantity * price;
        const disc = line.discAmount;
        const net = gross - disc;
        const vt = calcVatAndTotal(net, vatType === 'Vat');
        return {
          ...line,
          productId: product._id,
          productCode: product.code ?? '',
          imei: imei || line.imei,
          name: product.name ?? '',
          unitId: uid,
          unitName: uname,
          availableUnits,
          price,
          gross,
          vatAmount: vt.vatAmount,
          total: vt.total,
          batchNumber: selectedBatch?.batchNumber,
        };
      })
    );
    setTimeout(() => qtyInputRefs.current[lineId]?.focus(), 50);
  }, [vatType, calcVatAndTotal]);

  const handleProductSelect = useCallback(async (lineId: string, product: ProductOption) => {
    // Always fetch product by ID so batch decision uses server truth (list can have stale/wrong allowBatches)
    let productToUse: ProductOption = product;
    if (companyId) {
      try {
        const res = await productApi.get(product._id, companyId);
        const fetched = res.data?.data as { allowBatches?: boolean } | undefined;
        if (fetched) {
          productToUse = { ...product, allowBatches: fetched.allowBatches === true };
        }
      } catch {
        // use original product
      }
    }

    const batches = await getBatchesForProduct(productToUse._id);
    // Only show batch dialog when batch selection is explicitly enabled (allowBatches === true). Applies to ALL products.
    const batchSelectionEnabled = (productToUse as { allowBatches?: boolean }).allowBatches === true;

    if (!batchSelectionEnabled) {
      // Merged for all products with allowBatches false or undefined
      if (batches.length > 0) {
        const nonZeroBatches = batches.filter((b: { quantity: number }) => b.quantity > 0);
        const avgPurchasePrice = nonZeroBatches.length > 0
          ? nonZeroBatches.reduce((sum: number, b: { purchasePrice: number }) => sum + b.purchasePrice, 0) / nonZeroBatches.length
          : batches[0].purchasePrice;
        const totalQty = nonZeroBatches.reduce((sum: number, b: { quantity: number }) => sum + b.quantity, 0) || batches.reduce((sum: number, b: { quantity: number }) => sum + b.quantity, 0);
        const avgRetail = nonZeroBatches.length > 0
          ? nonZeroBatches.reduce((sum: number, b: { retail: number }) => sum + b.retail, 0) / nonZeroBatches.length
          : batches[0].retail;
        const mergedBatch = {
          batchNumber: 'MERGED',
          productId: productToUse._id,
          productName: productToUse.name,
          purchasePrice: avgPurchasePrice,
          expiryDate: '',
          quantity: totalQty,
          retail: avgRetail,
          wholesale: (batches[0] as { wholesale?: number }).wholesale ?? avgRetail,
        };
        completeProductSelection(lineId, productToUse, mergedBatch);
      } else {
        completeProductSelection(lineId, productToUse);
      }
      return;
    }

    if (batches.length >= 1) {
      setAvailableBatches(batches);
      setPendingProductSelection({ lineId, product: productToUse });
      setFocusedBatchIndex(0);
      setBatchDialogOpen(true);
    } else {
      completeProductSelection(lineId, productToUse);
    }
  }, [getBatchesForProduct, completeProductSelection, companyId]);

  const handleBatchSelect = useCallback((selectedBatch: typeof availableBatches[0]) => {
    if (pendingProductSelection) {
      completeProductSelection(pendingProductSelection.lineId, pendingProductSelection.product, selectedBatch);
    }
    setBatchDialogOpen(false);
    setAvailableBatches([]);
    setPendingProductSelection(null);
  }, [pendingProductSelection, completeProductSelection]);

  const handleBatchDialogClose = useCallback(() => {
    setBatchDialogOpen(false);
    setAvailableBatches([]);
    setPendingProductSelection(null);
    setFocusedBatchIndex(0);
  }, []);

  const handleBatchDialogKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!batchDialogOpen || availableBatches.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedBatchIndex((prev) => (prev < availableBatches.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedBatchIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selectedBatch = availableBatches[focusedBatchIndex];
      if (selectedBatch) {
        handleBatchSelect(selectedBatch);
      }
    }
  }, [batchDialogOpen, availableBatches, focusedBatchIndex, handleBatchSelect]);

  // Open batch dialog only when product has allowBatches from server (e.g. return to item field and press Enter)
  const openBatchDialogForLine = useCallback(async (line: LineItem): Promise<boolean> => {
    if (!line.productId) return false;
    let product = products.find((p) => p._id === line.productId);
    if (!product) return false;
    // Always fetch so allowBatches is from server (e.g. Lenova with allowBatches: false never opens batch dialog)
    if (companyId) {
      try {
        const res = await productApi.get(product._id, companyId);
        const fetched = res.data?.data as { allowBatches?: boolean } | undefined;
        if (fetched) {
          product = { ...product, allowBatches: fetched.allowBatches === true };
        }
      } catch {
        // use original product
      }
    }
    if ((product as { allowBatches?: boolean }).allowBatches !== true) return false;
    const batches = await getBatchesForProduct(product._id);
    if (batches.length >= 1) {
      setAvailableBatches(batches);
      setPendingProductSelection({ lineId: line.id, product });
      setFocusedBatchIndex(0);
      setBatchDialogOpen(true);
      return true;
    }
    return false;
  }, [products, getBatchesForProduct, companyId]);

  const handleUnitChange = useCallback((lineId: string, unitId: string) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        const u = line.availableUnits.find((x) => x.id === unitId);
        return { ...line, unitId, unitName: u?.name ?? line.unitName };
      })
    );
  }, []);

  const handleUnitKeyDown = useCallback((e: React.KeyboardEvent, lineId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      const line = lines.find((l) => l.id === lineId);
      if (line) setTimeout(() => qtyInputRefs.current[line.id]?.focus(), 50);
    }
  }, [lines]);

  const handleOtherDiscPercentChange = useCallback((pct: number) => {
    setOtherDiscPercent(pct);
    const itemsTotal = lines.reduce((s, l) => s + l.total, 0);
    setOtherDiscount(parseFloat((itemsTotal * (pct / 100)).toFixed(2)));
  }, [lines]);

  const handleImeiSearch = useCallback(async (lineId: string, imeiValue: string) => {
    if (!imeiValue?.trim() || !companyId) return;
    const searchImei = imeiValue.trim();
    try {
      const res = await productApi.getByImei(companyId, searchImei);
      const data = res.data?.data as { product?: ProductOption; matchedMultiUnitId?: string } | undefined;
      const product = data?.product;
      if (product) {
        const multiUnit = product.multiUnits?.find((mu) => mu.imei === searchImei);
        const displayImei = multiUnit?.imei ?? product.imei ?? searchImei;
        handleProductSelect(lineId, { ...product, imei: displayImei });
        updateLine(lineId, 'imei', displayImei);
      }
    } catch {
      // IMEI not found – leave focus on item name
    }
  }, [companyId, handleProductSelect, updateLine]);

  // Enter key flow: if IMEI has value and no product, search by IMEI; else move to next field
  const handleImeiKeyDown = useCallback((e: React.KeyboardEvent, line: LineItem) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (line.imei.trim() && !line.productId) {
        handleImeiSearch(line.id, line.imei);
        return;
      }
      setTimeout(() => itemNameInputRefs.current[line.id]?.focus(), 50);
    }
  }, [handleImeiSearch]);
  const handleItemNameKeyDown = useCallback((e: React.KeyboardEvent, line: LineItem) => {
    if (e.key === 'Enter') {
      // Use current input value from DOM so we don't rely on state (user may have just typed and state not yet updated)
      const inputEl = (e.target as HTMLElement)?.closest?.('input') || (e.target as HTMLInputElement) || itemNameInputRefs.current[line.id];
      const currentTyped = (inputEl && 'value' in inputEl ? (inputEl as HTMLInputElement).value : line.name) ?? '';
      const typed = currentTyped.trim();

      // If user typed an exact product name (match by name), select that product immediately without waiting for list selection
      if (typed && !line.productId) {
        const exactMatch = products.find((p) => (p.name || '').trim().toLowerCase() === typed.toLowerCase());
        if (exactMatch) {
          e.preventDefault();
          e.stopPropagation();
          handleProductSelect(line.id, exactMatch).then(() => {
            setTimeout(() => {
              qtyInputRefs.current[line.id]?.focus();
              qtyInputRefs.current[line.id]?.select();
            }, 100);
          });
          return;
        }
      }

      // If row already has a product, Enter opens batch dialog only when server says allowBatches (don't use list)
      if (line.productId) {
        e.preventDefault();
        e.stopPropagation();
        openBatchDialogForLine(line).then((opened) => {
          if (!opened) {
            if (line.availableUnits.length > 0) {
              setTimeout(() => unitInputRefs.current[line.id]?.focus(), 50);
            } else {
              setTimeout(() => qtyInputRefs.current[line.id]?.focus(), 50);
            }
          }
        });
        return;
      }
      e.preventDefault();
      if (line.availableUnits.length > 0) {
        setTimeout(() => unitInputRefs.current[line.id]?.focus(), 50);
      } else {
        setTimeout(() => qtyInputRefs.current[line.id]?.focus(), 50);
      }
    }
  }, [products, openBatchDialogForLine, handleProductSelect]);
  const handleQtyKeyDown = useCallback((e: React.KeyboardEvent, line: LineItem) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const priceInput = priceInputRefs.current[line.id];
      if (priceInput) {
        priceInput.focus();
        priceInput.select();
      }
    }
  }, []);
  const handlePriceKeyDown = useCallback((e: React.KeyboardEvent, line: LineItem) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const hasItemCode = !!(line.productId && line.productCode?.trim());
      const hasItemName = !!(line.name?.trim());
      const hasImei = !!(line.imei?.trim());
      const hasQty = line.quantity > 0;
      const hasPrice = line.price > 0;
      if (!hasItemCode || !hasItemName || !hasImei || !hasQty || !hasPrice) {
        if (!hasItemCode || !hasItemName) {
          setTimeout(() => itemNameInputRefs.current[line.id]?.focus(), 50);
        } else if (!hasImei) {
          setTimeout(() => imeiInputRefs.current[line.id]?.focus(), 50);
        } else if (!hasQty) {
          setTimeout(() => qtyInputRefs.current[line.id]?.focus(), 50);
        } else {
          setTimeout(() => priceInputRefs.current[line.id]?.focus(), 50);
        }
        return;
      }
      rowCommittedRef.current = true;
      rowSnapshotRef.current = null;
      const currentIndex = lines.findIndex((l) => l.id === line.id);
      if (currentIndex >= 0 && currentIndex < lines.length - 1) {
        const nextLine = lines[currentIndex + 1];
        enterRow(nextLine);
        setActiveLineId(nextLine.id);
        setTimeout(() => itemNameInputRefs.current[nextLine.id]?.focus(), 50);
        return;
      }
      const newLine = emptyLine();
      setLines((prev) => [...prev, newLine]);
      setActiveLineId(newLine.id);
      setTimeout(() => itemNameInputRefs.current[newLine.id]?.focus(), 100);
    }
  }, [lines, enterRow]);
  const handleDiscPercentKeyDown = useCallback((e: React.KeyboardEvent, line: LineItem) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setTimeout(() => discAmountInputRefs.current[line.id]?.focus(), 50);
    }
  }, []);
  const handleDiscAmountKeyDown = useCallback((e: React.KeyboardEvent, line: LineItem) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setTimeout(() => qtyInputRefs.current[line.id]?.focus(), 50);
    }
  }, []);

  const handleGridKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey && (e.key.toLowerCase() === 'm' || e.key.toLowerCase() === 'p')) {
      e.preventDefault();
    }
  }, []);

  const handleQtyBlur = useCallback((line: LineItem) => {
    const raw = editingNumericCell?.lineId === line.id && editingNumericCell?.field === 'quantity' ? editingNumericCell.value : '';
    const parsedQty = parseNumericInput(raw);
    setEditingNumericCell((prev) => (prev && prev.lineId === line.id && prev.field === 'quantity' ? null : prev));
    updateLine(line.id, 'quantity', parsedQty);
  }, [editingNumericCell, updateLine]);

  const itemsVat = lines.reduce((s, l) => s + l.vatAmount, 0);
  const netAdjustments = (Number(otherCharges) || 0) + (Number(freightCharge) || 0) + (Number(lendAddLess) || 0) + (Number(roundOff) || 0) - (Number(otherDiscount) || 0);
  const vatFromAdjustments = vatType === 'Vat' && netAdjustments !== 0
    ? parseFloat((netAdjustments * VAT_RATE / (100 + VAT_RATE)).toFixed(2))
    : 0;
  const calculations = {
    subTotal: lines.reduce((s, l) => s + l.total, 0),
    totalVat: itemsVat + vatFromAdjustments,
    otherDiscount: Number(otherDiscount) || 0,
    otherCharges: Number(otherCharges) || 0,
    freightCharge: Number(freightCharge) || 0,
    lendAddLess: Number(lendAddLess) || 0,
    roundOff: Number(roundOff) || 0,
    grandTotal: 0,
  };
  calculations.grandTotal = calculations.subTotal - calculations.otherDiscount + calculations.otherCharges + calculations.freightCharge + calculations.lendAddLess + calculations.roundOff;

  const handleSave = useCallback(async () => {
    if (returnType === 'ByRef' && !originalInvoiceIdForReturn) {
      setErrorDialogMessage('By Ref: please select items from a sales invoice first (Enter Sales Invoice No).');
      setErrorDialogOpen(true);
      return;
    }
    const validLines = lines.filter((l) => l.productId && l.quantity > 0 && l.price >= 0);
    if (validLines.length === 0) {
      setErrorDialogMessage('Add at least one item with quantity and price');
      setErrorDialogOpen(true);
      return;
    }
    if (!companyId || !financialYearId) {
      setErrorDialogMessage('Company / Financial year not set');
      setErrorDialogOpen(true);
      return;
    }
    setLoading(true);
    try {
      const payload = {
        companyId,
        financialYearId,
        date,
        returnType,
        originalInvoiceId: returnType === 'ByRef' ? originalInvoiceIdForReturn ?? undefined : undefined,
        customerId: customerId || undefined,
        customerName: customerName || 'Walk-in',
        customerAddress: customerAddress || undefined,
        cashAccountId: !customerId ? (cashAccountId || undefined) : undefined,
        vatType,
        taxMode,
        items: validLines.map((l) => ({
          productId: l.productId,
          productCode: l.productCode,
          imei: l.imei || undefined,
          description: l.name,
          quantity: l.quantity,
          unitPrice: l.price,
          discount: l.discAmount,
          discountPercent: l.discPercent,
          unitName: l.unitName || undefined,
          batchNumber: l.batchNumber || undefined,
        })),
        otherDiscount: calculations.otherDiscount,
        otherCharges: calculations.otherCharges,
        freightCharge: calculations.freightCharge,
        lendAddLess: calculations.lendAddLess,
        roundOff: calculations.roundOff,
        narration: narration || undefined,
      };
      const res = await salesApi.createSalesReturn(payload);
      setSaveDialogOpen(false);
      setSavedDialogMessage(`Sales Return ${res.data.data.invoiceNo} saved successfully.`);
      setSavedDialogOpen(true);
      setLines([emptyLine()]);
      setCustomerId(null);
      setCustomerName('CASH');
      setCustomerAddress('');
      setReturnId(null);
      setSalesAccountName('');
      setCurrentNavIndex(-1);
      setNarration('');
      setOtherDiscount(0);
      setOtherCharges(0);
      setFreightCharge(0);
      setLendAddLess(0);
      setRoundOff(0);
      setOriginalInvoiceIdForReturn(null);
      loadNextInvoiceNo();
      loadInvoiceList();
    } catch (e: unknown) {
      setErrorDialogMessage((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Save failed');
      setErrorDialogOpen(true);
    } finally {
      setLoading(false);
    }
  }, [companyId, financialYearId, date, returnType, originalInvoiceIdForReturn, customerId, customerName, customerAddress, cashAccountId, vatType, taxMode, lines, otherDiscount, otherCharges, freightCharge, lendAddLess, roundOff, narration, calculations, loadNextInvoiceNo, loadInvoiceList]);

  const handleEditConfirm = useCallback(async () => {
    if (!returnId || !companyId || !financialYearId) return;
    if (returnType === 'ByRef' && !originalInvoiceIdForReturn) {
      setErrorDialogMessage('By Ref: please select items from a sales invoice first (Enter Sales Invoice No).');
      setErrorDialogOpen(true);
      setEditConfirmOpen(false);
      return;
    }
    const validLines = lines.filter((l) => l.productId && l.quantity > 0 && l.price >= 0);
    if (validLines.length === 0) {
      setErrorDialogMessage('Add at least one item with quantity and price');
      setErrorDialogOpen(true);
      setEditConfirmOpen(false);
      return;
    }
    setEditConfirmOpen(false);
    setLoading(true);
    try {
      const payload = {
        companyId,
        financialYearId,
        date,
        returnType,
        originalInvoiceId: returnType === 'ByRef' ? originalInvoiceIdForReturn ?? undefined : undefined,
        customerId: customerId || undefined,
        customerName: customerName || 'Walk-in',
        customerAddress: customerAddress || undefined,
        cashAccountId: !customerId ? (cashAccountId || undefined) : undefined,
        vatType,
        taxMode,
        items: validLines.map((l) => ({
          productId: l.productId,
          productCode: l.productCode,
          imei: l.imei || undefined,
          description: l.name,
          quantity: l.quantity,
          unitPrice: l.price,
          discount: l.discAmount,
          discountPercent: l.discPercent,
          unitName: l.unitName || undefined,
          batchNumber: l.batchNumber || undefined,
        })),
        otherDiscount: calculations.otherDiscount,
        otherCharges: calculations.otherCharges,
        freightCharge: calculations.freightCharge,
        lendAddLess: calculations.lendAddLess,
        roundOff: calculations.roundOff,
        narration: narration || undefined,
      };
      await salesApi.updateSalesReturn(returnId, payload);
      loadInvoiceList();
      setEditSuccessDialogOpen(true);
    } catch (e: unknown) {
      setErrorDialogMessage((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Update failed');
      setErrorDialogOpen(true);
    } finally {
      setLoading(false);
    }
  }, [returnId, companyId, financialYearId, date, returnType, originalInvoiceIdForReturn, customerId, customerName, customerAddress, cashAccountId, vatType, taxMode, lines, narration, calculations, loadInvoiceList]);

  const handleClear = useCallback(() => {
    setLines([emptyLine()]);
    setCustomerId(null);
    setCustomerName('CASH');
    setCustomerAddress('');
    setReturnId(null);
    setSalesAccountName('');
    setCurrentNavIndex(-1);
    setNarration('');
    setOtherDiscPercent(0);
    setOtherDiscount(0);
    setOtherCharges(0);
    setFreightCharge(0);
    setLendAddLess(0);
    setRoundOff(0);
    setRefInvoiceData(null);
    setOriginalInvoiceIdForReturn(null);
    loadNextInvoiceNo();
  }, [loadNextInvoiceNo]);

  const handleSearch = useCallback(async () => {
    if (!companyId || !searchInvoiceNo.trim()) {
      setSearchError('Enter return invoice number');
      return;
    }
    setSearchError('');
    setSearchLoading(true);
    try {
      const res = await salesApi.searchSalesReturn(companyId, searchInvoiceNo.trim());
      const data = res.data.data as {
        _id: string; invoiceNo: string; date: string; returnType: string;
        originalInvoiceId?: string;
        customerId?: string; customerName?: string; customerAddress?: string; cashAccountId?: string;
        vatType?: string; taxMode?: string; items: Array<{
          productId: string | { _id: string; name?: string };
          productCode?: string;
          description?: string;
          quantity: number;
          unitPrice: number;
          discount?: number;
          totalAmount?: number;
          unitName?: string;
        }>;
        otherDiscount?: number;
        otherCharges?: number;
        freightCharge?: number;
        lendAddLess?: number;
        roundOff?: number;
        narration?: string;
      };
      setReturnId(data._id);
      setInvoiceNo(data.invoiceNo);
      setDate(data.date ? new Date(data.date).toISOString().slice(0, 10) : getCurrentDate());
      setReturnType((data.returnType || 'OnAccount') as 'OnAccount' | 'ByRef');
      setOriginalInvoiceIdForReturn(data.originalInvoiceId ?? null);
      setCustomerId(data.customerId ?? null);
      setCustomerName(data.customerName ?? 'CASH');
      setCustomerAddress(data.customerAddress ?? '');
      setVatType((data.vatType as 'Vat' | 'NonVat') || 'Vat');
      setTaxMode((data.taxMode as 'inclusive' | 'exclusive') ?? 'exclusive');
      setOtherDiscount(data.otherDiscount ?? 0);
      setOtherCharges(data.otherCharges ?? 0);
      setFreightCharge(data.freightCharge ?? 0);
      setLendAddLess(data.lendAddLess ?? 0);
      setRoundOff(data.roundOff ?? 0);
      setNarration(data.narration ?? '');
      setSalesAccountName((data as { salesAccountName?: string; cashAccountName?: string }).salesAccountName ?? (data as { cashAccountName?: string }).cashAccountName ?? '');
      if (data.cashAccountId) setCashAccountId(data.cashAccountId);
      const newLines: LineItem[] = (data.items || []).map((it, idx) => {
        const pid = typeof it.productId === 'object' && it.productId !== null ? (it.productId as { _id: string })._id : String(it.productId);
        const name = typeof it.productId === 'object' && (it.productId as { name?: string }).name ? (it.productId as { name: string }).name : (it.description || '');
        const price = it.unitPrice ?? 0;
        const qty = it.quantity ?? 0;
        const disc = it.discount ?? 0;
        const gross = qty * price;
        const net = gross - disc;
        const vatRate = data.vatType === 'NonVat' ? 0 : 5;
        const vatAmount = parseFloat((net * (vatRate / 100)).toFixed(2));
        const lineTotal = parseFloat((net + vatAmount).toFixed(2));
        const uname = (it.unitName as string) || 'Pcs';
        const uid = (it as { unitId?: string }).unitId || 'pcs';
        const availableUnits: UnitOption[] = [{ id: uid, name: uname }];
        const itWithImei = it as { imei?: string };
        return {
          id: `loaded-${idx}-${Date.now()}`,
          productId: pid,
          productCode: (it.productCode as string) || '',
          imei: itWithImei.imei || '',
          name: name || '',
          unitId: uid,
          unitName: uname,
          availableUnits,
          quantity: qty,
          price,
          purchasePrice: 0,
          gross,
          discPercent: 0,
          discAmount: disc,
          vatAmount,
          total: lineTotal,
          batchNumber: (it as { batchNumber?: string }).batchNumber,
        };
      });
      setLines(newLines.length > 0 ? newLines : [emptyLine()]);
      setSearchDialogOpen(false);
      setSearchInvoiceNo('');
      if (financialYearId) {
        loadInvoiceList().then(async () => {
          try {
            const r = await salesApi.listSalesReturns(companyId, financialYearId);
            const list = Array.isArray(r.data.data) ? r.data.data : [];
            const navIdx = list.findIndex((i: { _id: string }) => i._id === data._id);
            setCurrentNavIndex(navIdx >= 0 ? navIdx : 0);
          } catch {
            setCurrentNavIndex(0);
          }
        });
      }
    } catch {
      setSearchError('Sales return not found');
    } finally {
      setSearchLoading(false);
    }
  }, [companyId, financialYearId, searchInvoiceNo, loadInvoiceList]);

  const handleDelete = useCallback(async () => {
    if (!returnId || !companyId) return;
    setLoading(true);
    try {
      await salesApi.deleteSalesReturn(returnId, companyId);
      setDeleteDialogOpen(false);
      setSavedDialogMessage('Sales return deleted successfully.');
      setSavedDialogOpen(true);
      handleClear();
    } catch (e: unknown) {
      setErrorDialogMessage((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Delete failed');
      setErrorDialogOpen(true);
    } finally {
      setLoading(false);
    }
  }, [returnId, companyId, handleClear]);

  const toggleRefItem = (itemId: string) => {
    setSelectedRefItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };
  const selectAllRefItems = (checked: boolean) => {
    if (!refInvoiceData) return;
    setSelectedRefItemIds(checked ? new Set(refInvoiceData.items.map((i) => i._id)) : new Set());
  };

  const selectedRefTotal = refInvoiceData
    ? refInvoiceData.items.filter((i) => selectedRefItemIds.has(i._id)).reduce((s, i) => s + (i.totalAmount ?? 0), 0)
    : 0;

  return (
    <Box sx={{ p: 2, minHeight: '100%', bgcolor: '#f1f5f9' }} onClick={() => dispatch(setDrawerOpen(false))}>
      <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f766e', mb: 1.5 }}>
        Sales Return
      </Typography>

      {/* Header - B2C style */}
      <Paper elevation={0} sx={{ px: 2, py: 1.5, mb: 1, borderRadius: 2, bgcolor: 'white', border: '1px solid #e0e7ef' }}>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={6} sm={3} md={1.8} lg={1.3}>
            <Box sx={{ bgcolor: '#0f766e', borderRadius: 1.5, px: 1.5, py: 0.6, textAlign: 'center' }}>
              <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.65rem', fontWeight: 500, lineHeight: 1, letterSpacing: 0.5 }}>RETURN NO</Typography>
              <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.3 }}>{invoiceNo}</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3} md={2} lg={1.7}>
            <DateInput label="Date" value={date} onChange={setDate} size="small" />
          </Grid>
          <Grid item xs={6} sm={3} md={2.5} lg={2.2}>
            <Autocomplete
              size="small"
              options={customers}
              getOptionLabel={(opt) => opt.name || ''}
              value={customerId ? (customers.find((c) => c._id === customerId) || null) : (customers.find((c) => c._id === 'cash') || null)}
              onChange={(_, v) => {
                const isCash = v?._id === 'cash';
                if (isCash && paymentType === 'Credit') return;
                setCustomerId(isCash ? null : (v?._id ?? null));
                setCustomerName(v?.name ?? '');
                setCustomerAddress(isCash ? '' : (v?.address ?? ''));
                setPaymentType(isCash ? 'Cash' : 'Credit');
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  inputRef={customerAcRef}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setTimeout(() => customerNameRef.current?.focus(), 50);
                    }
                  }}
                  label="Cash / Customer A/C"
                  InputLabelProps={{ shrink: true }}
                  placeholder="Select Cash or Customer"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />
              )}
            />
          </Grid>
          <Grid item xs={6} sm={3} md={2.5} lg={2.5}>
            <TextField
              size="small"
              label="Customer Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              inputRef={customerNameRef}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setTimeout(() => taxModeRef.current?.focus(), 50);
                }
              }}
              InputLabelProps={{ shrink: true }}
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
          </Grid>
          <Grid item xs={6} sm={3} md={2} lg={1.5}>
            <TextField
              size="small"
              select
              label="Tax"
              value={taxMode}
              onChange={(e) => setTaxMode(e.target.value as 'inclusive' | 'exclusive')}
              inputRef={taxModeRef}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  setTimeout(() => returnTypeRef.current?.focus(), 50);
                } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  setTaxMode((prev) => (prev === 'inclusive' ? 'exclusive' : 'inclusive'));
                }
              }}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 130, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            >
              <MenuItem value="inclusive">Include</MenuItem>
              <MenuItem value="exclusive">Exclude</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={6} sm={3} md={2} lg={1.5}>
            <TextField
              size="small"
              select
              label="Return Type"
              value={returnType}
              onChange={(e) => setReturnType(e.target.value as 'OnAccount' | 'ByRef')}
              inputRef={returnTypeRef}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  if (returnType === 'ByRef' && refInvoiceNoRef.current) {
                    refInvoiceNoRef.current.focus();
                  } else if (lines[0]) {
                    setTimeout(() => imeiInputRefs.current[lines[0].id]?.focus(), 50);
                  }
                } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  setReturnType((prev) => (prev === 'OnAccount' ? 'ByRef' : 'OnAccount'));
                }
              }}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 130, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            >
              <MenuItem value="OnAccount">On Account</MenuItem>
              <MenuItem value="ByRef">By Ref</MenuItem>
            </TextField>
          </Grid>
          {returnType === 'ByRef' && (
            <>
              <Grid item xs={6} sm={3} md={2} lg={2}>
                <TextField
                  size="small"
                  label="Sales Invoice No"
                  value={refInvoiceNoInput}
                  onChange={(e) => { setRefInvoiceNoInput(e.target.value); setRefInvoiceError(''); }}
                  inputRef={refInvoiceNoRef}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      fetchRefInvoice();
                    }
                  }}
                  error={!!refInvoiceError}
                  helperText={refInvoiceError}
                  placeholder="Enter invoice no"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />
              </Grid>
              <Grid item xs="auto">
                <Button
                  variant="contained"
                  size="small"
                  onClick={fetchRefInvoice}
                  disabled={refInvoiceLoading}
                  sx={{ height: 40, textTransform: 'none', borderRadius: 1.5, bgcolor: '#0f766e', '&:hover': { bgcolor: '#115e59' } }}
                >
                  {refInvoiceLoading ? 'Loading...' : 'Load'}
                </Button>
              </Grid>
            </>
          )}
        </Grid>
        <Divider sx={{ my: 1.5 }} />
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={6} sm={3} md={2} lg={1.5}>
            <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 1.5, px: 1.2, py: 0.5, bgcolor: '#f8fafc', height: '100%' }}>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', letterSpacing: 0.3, mb: 0.2 }}>VAT TYPE</Typography>
              <RadioGroup row value={vatType} onChange={(e) => setVatType(e.target.value as 'Vat' | 'NonVat')}>
                <FormControlLabel value="Vat" control={<Radio size="small" sx={{ p: 0.3 }} />} label="Vat" sx={{ mr: 1, '& .MuiFormControlLabel-label': { fontSize: '0.78rem' } }} />
                <FormControlLabel value="NonVat" control={<Radio size="small" sx={{ p: 0.3 }} />} label="Non Vat" sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.78rem' } }} />
              </RadioGroup>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3} md={2} lg={1.5}>
            <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 1.5, px: 1.2, py: 0.5, bgcolor: '#f8fafc', height: '100%' }}>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', letterSpacing: 0.3, mb: 0.2 }}>PAYMENT</Typography>
              <RadioGroup row value={paymentType} onChange={(e) => {
                const val = e.target.value as 'Cash' | 'Credit';
                if (val === 'Credit' && !customerId) return;
                setPaymentType(val);
              }}>
                <FormControlLabel value="Cash" control={<Radio size="small" sx={{ p: 0.3 }} />} label="Cash" sx={{ mr: 1, '& .MuiFormControlLabel-label': { fontSize: '0.78rem' } }} />
                <FormControlLabel value="Credit" control={<Radio size="small" sx={{ p: 0.3 }} />} label="Credit" disabled={!customerId} sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.78rem' } }} />
              </RadioGroup>
            </Box>
          </Grid>
          {/* Navigation Panel */}
          <Grid item xs="auto">
            <Box sx={{ display: 'flex', gap: 0.3, alignItems: 'center' }}>
              <IconButton onClick={navFirst} disabled={invoiceList.length === 0} size="medium" sx={{ border: '1px solid #e2e8f0', borderRadius: 1, p: 1, '&:hover': { bgcolor: '#f8fafc' } }} title="First"><FirstIcon sx={{ color: '#1e293b', fontSize: '1.5rem' }} /></IconButton>
              <IconButton onClick={navPrev} disabled={invoiceList.length === 0 || currentNavIndex === 0} size="medium" sx={{ border: '1px solid #e2e8f0', borderRadius: 1, p: 1, '&:hover': { bgcolor: '#f8fafc' } }} title="Previous"><PrevIcon sx={{ color: '#1e293b', fontSize: '1.5rem' }} /></IconButton>
              <IconButton onClick={navNext} disabled={invoiceList.length === 0 || currentNavIndex >= invoiceList.length - 1} size="medium" sx={{ border: '1px solid #e2e8f0', borderRadius: 1, p: 1, '&:hover': { bgcolor: '#f8fafc' } }} title="Next"><NextIcon sx={{ color: '#1e293b', fontSize: '1.5rem' }} /></IconButton>
              <IconButton onClick={navLast} disabled={invoiceList.length === 0} size="medium" sx={{ border: '1px solid #e2e8f0', borderRadius: 1, p: 1, '&:hover': { bgcolor: '#f8fafc' } }} title="Last"><LastIcon sx={{ color: '#1e293b', fontSize: '1.5rem' }} /></IconButton>
              {invoiceList.length > 0 && (
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, ml: 0.3, fontSize: '0.7rem' }}>
                  {currentNavIndex >= 0 ? `${currentNavIndex + 1}/${invoiceList.length}` : `${invoiceList.length}`}
                </Typography>
              )}
            </Box>
          </Grid>
          {/* Product Info Section (same as Sales B2C) */}
          <Grid item xs={12} md={12} lg={6}>
            <Box sx={{
              borderRadius: 1.5, px: 1.5, py: 0.8, height: '100%', display: 'flex', alignItems: 'center', gap: 1.5,
              background: selectedProductInfo ? 'linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 50%, #f0fdf4 100%)' : '#f8fafc',
              border: selectedProductInfo ? '1px solid #99f6e4' : '1px dashed #cbd5e1',
              transition: 'all 0.2s',
            }}>
              {selectedProductInfo ? (
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'nowrap', alignItems: 'center', overflow: 'hidden', flex: 1 }}>
                  <Box sx={{ minWidth: 0, px: 1, py: 0.3, bgcolor: (selectedProductInfo.profit ?? 0) >= 0 ? '#dcfce7' : '#fee2e2', borderRadius: 1 }}>
                    <Typography sx={{ fontSize: '0.62rem', lineHeight: 1, color: '#64748b', fontWeight: 500 }}>Profit</Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.3, color: (selectedProductInfo.profit ?? 0) >= 0 ? '#15803d' : '#dc2626' }}>{(selectedProductInfo.profit ?? 0).toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.62rem', lineHeight: 1, color: '#64748b', fontWeight: 500 }}>P.Rate</Typography>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1.3 }}>{selectedProductInfo.purchaseRate.toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.62rem', lineHeight: 1, color: '#64748b', fontWeight: 500 }}>Retail</Typography>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1.3, color: '#15803d' }}>{(selectedProductInfo.retailPrice ?? selectedProductInfo.purchaseRate).toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.62rem', lineHeight: 1, color: '#64748b', fontWeight: 500 }}>Vendor</Typography>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, lineHeight: 1.3 }}>{selectedProductInfo.lastVendor ?? '-'}</Typography>
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.62rem', lineHeight: 1, color: '#64748b', fontWeight: 500 }}>Stock</Typography>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1.3, color: '#0369a1' }}>
                      {selectedProductInfo.stock !== undefined && selectedProductInfo.stock !== null ? selectedProductInfo.stock : '-'}
                    </Typography>
                  </Box>
                  {selectedProductInfo.batchNumber && (
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.62rem', lineHeight: 1, color: '#64748b', fontWeight: 500 }}>Batch</Typography>
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.3, color: '#0284c7' }}>
                        {selectedProductInfo.batchNumber.length > 10 ? selectedProductInfo.batchNumber.substring(0, 10) + '..' : selectedProductInfo.batchNumber}
                      </Typography>
                    </Box>
                  )}
                </Box>
              ) : (
                <Typography sx={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>Select a product to see details</Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Product Grid - same as Sales B2C */}
      <Paper elevation={0} sx={{ mb: 1, width: '100%', overflow: 'hidden', border: '1px solid #e0e7ef', borderRadius: 2, bgcolor: 'white' }}>
        <TableContainer
          sx={{ minHeight: 400, maxHeight: 400, width: '100%', bgcolor: '#fafbfc', '& fieldset': { borderColor: '#e2e8f0' } }}
          onBlurCapture={(e) => {
            const container = e.currentTarget;
            setTimeout(() => {
              const active = document.activeElement;
              if (!active) return;
              const inPopper = active.closest('.MuiAutocomplete-popper, .MuiAutocomplete-listbox, .MuiPopper-root');
              if (inPopper) return;
              if (!container.contains(active)) {
                revertUncommittedRow();
              }
            }, 100);
          }}
        >
          <Table stickyHeader size="small" sx={{ minWidth: '100%', tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0, '& .MuiTableCell-root': { fontSize: '0.82rem' }, '& .MuiInputBase-input': { fontSize: '0.82rem' }, '& .MuiAutocomplete-input': { fontSize: '0.82rem' } }}>
            <TableHead>
              <TableRow>
                {[
                  { label: 'Sl', w: '3%' },
                  { label: 'Item Code', w: '6%' },
                  { label: 'IMEI', w: '9%' },
                  { label: 'Item Name', w: '19%' },
                  { label: 'Unit', w: '8%' },
                  { label: 'QTY', w: '6%' },
                  { label: 'Price', w: '6%' },
                  { label: 'Gross', w: '8%' },
                  { label: 'Disc%', w: '5%' },
                  { label: 'Disc', w: '5%' },
                  { label: 'VAT', w: '5%' },
                  { label: 'Total', w: '8%' },
                  { label: '', w: '3%' },
                ].map((col, ci) => (
                  <TableCell key={ci} sx={{
                    bgcolor: '#0f766e', color: 'white', fontWeight: 600, fontSize: '0.75rem', width: col.w,
                    p: '6px 4px', textAlign: 'center', letterSpacing: 0.3, textTransform: 'uppercase',
                    borderRight: ci < 12 ? '1px solid rgba(255,255,255,0.15)' : 'none',
                  }}>
                    {col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map((line, idx) => (
                <TableRow
                  key={line.id}
                  sx={{
                    bgcolor: idx === 0 && !line.productId ? '#fffbeb' : (idx % 2 === 0 ? '#f8fafb' : 'white'),
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#e0f7fa' },
                    transition: 'background-color 0.1s',
                  }}
                  onClick={(e) => handleRowClick(line, e)}
                  onFocusCapture={() => { enterRow(line); setActiveLineId(line.id); }}
                  onKeyDownCapture={(e) => handleGridKeyDown(e)}
                >
                  <TableCell sx={{ p: '3px', borderRight: '1px solid #f0f0f0', borderBottom: '1px solid #eef2f6', textAlign: 'center', fontWeight: 700, color: '#64748b', fontSize: '0.8rem', bgcolor: '#f1f5f9' }}>{idx + 1}</TableCell>
                  <TableCell sx={{ p: '3px', borderRight: '1px solid #f0f0f0', borderBottom: '1px solid #eef2f6' }}>
                    <TextField size="small" variant="outlined" value={line.productCode} fullWidth InputProps={{ readOnly: true }} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '& fieldset': { borderColor: '#e2e8f0' } }, '& .MuiOutlinedInput-input': { py: 0.3, fontSize: '0.82rem' } }} />
                  </TableCell>
                  <TableCell sx={{ p: '3px', borderRight: '1px solid #f0f0f0', borderBottom: '1px solid #eef2f6' }} onClick={(e) => e.stopPropagation()}>
                    <TextField
                      size="small"
                      variant="outlined"
                      value={line.imei}
                      onChange={(e) => updateLine(line.id, 'imei', e.target.value)}
                      onFocus={handleTextFieldFocus}
                      onKeyDown={(e) => {
                        handleGridArrowNavigation(e, line.id, imeiInputRefs);
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (!line.imei.trim()) setTimeout(() => itemNameInputRefs.current[line.id]?.focus(), 50);
                          else handleImeiSearch(line.id, line.imei);
                        } else {
                          handleImeiKeyDown(e, line);
                        }
                      }}
                      inputRef={(el) => { imeiInputRefs.current[line.id] = el; }}
                      fullWidth
                      placeholder="IMEI"
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: 1, '& fieldset': { borderColor: '#e2e8f0' } }, '& .MuiOutlinedInput-input': { py: 0.3, fontSize: '0.82rem' } }}
                    />
                  </TableCell>
                  <TableCell sx={{ p: '3px', borderRight: '1px solid #f0f0f0', borderBottom: '1px solid #eef2f6' }} onClick={(e) => e.stopPropagation()}>
                    {returnType === 'OnAccount' ? (
                      <Autocomplete
                        size="small"
                        freeSolo
                        options={products}
                        filterOptions={productFilterOptions}
                        getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.name || '')}
                        isOptionEqualToValue={(opt, val) => (typeof opt === 'object' && typeof val === 'object' && opt._id === (val as ProductOption)._id)}
                        value={line.productId ? products.find((p) => p._id === line.productId) ?? null : null}
                        inputValue={line.name}
                        onInputChange={(_, v) => {
                          if (v.trim() === '') {
                            clearLineProduct(line.id);
                          } else {
                            updateLine(line.id, 'name', v);
                          }
                        }}
                        onChange={(_, v) => {
                          if (v && typeof v !== 'string') {
                            itemNameSnapshotRef.current = null;
                            void handleProductSelect(line.id, v);
                          }
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            variant="outlined"
                            placeholder="Item name"
                            inputRef={(el) => { itemNameInputRefs.current[line.id] = el; }}
                            onFocus={() => handleItemNameFocus(line)}
                            onBlur={() => handleItemNameBlur(line)}
                            onKeyDown={(e) => handleItemNameKeyDown(e, line)}
                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: 1, '& fieldset': { borderColor: '#e2e8f0' } }, '& .MuiOutlinedInput-input': { py: 0.3, fontSize: '0.82rem' } }}
                          />
                        )}
                        renderOption={(props, opt) => (
                          <li {...props} key={opt._id} style={{ fontSize: '0.82rem', fontWeight: 400, padding: '6px 14px', background: '#ffffff', color: '#334155', cursor: 'pointer' }}>
                            {opt.name}
                          </li>
                        )}
                        ListboxProps={{
                          sx: {
                            p: 0,
                            maxHeight: 250,
                            overflowX: 'hidden',
                            overflowY: 'auto',
                            '&::-webkit-scrollbar': { display: 'none' },
                            msOverflowStyle: 'none',
                            scrollbarWidth: 'none',
                            '& .MuiAutocomplete-option': {
                              minHeight: 'auto', py: 0.75, px: 2, fontSize: '0.82rem', bgcolor: 'transparent',
                              '&[data-focus="true"]': { bgcolor: '#0f766e !important', color: '#ffffff !important' },
                              '&[aria-selected="true"]': { bgcolor: '#0f766e !important', color: '#ffffff !important' },
                              '&.Mui-focused': { bgcolor: '#0f766e !important', color: '#ffffff !important' }
                            }
                          }
                        }}
                        componentsProps={{
                          popper: { placement: 'bottom-start', modifiers: [{ name: 'flip', enabled: false }, { name: 'preventOverflow', enabled: false }] },
                          paper: { sx: { width: '300px', boxShadow: '0 8px 24px rgba(15,118,110,0.15)', borderRadius: '8px', border: '1px solid #99f6e4', bgcolor: '#ffffff', overflow: 'hidden', mt: 0.5 } }
                        }}
                        sx={{ width: '100%' }}
                      />
                    ) : (
                      <TextField
                        size="small"
                        variant="outlined"
                        value={line.name}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v.trim() === '') {
                            clearLineProduct(line.id);
                          } else {
                            updateLine(line.id, 'name', v);
                          }
                        }}
                        inputRef={(el) => { itemNameInputRefs.current[line.id] = el; }}
                        onFocus={() => handleItemNameFocus(line)}
                        onBlur={() => handleItemNameBlur(line)}
                        onKeyDown={(e) => handleItemNameKeyDown(e, line)}
                        fullWidth
                        placeholder="Item name"
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: 1, '& fieldset': { borderColor: '#e2e8f0' } }, '& .MuiOutlinedInput-input': { py: 0.3, fontSize: '0.82rem' } }}
                      />
                    )}
                  </TableCell>
                  <TableCell
                    sx={{ p: '3px', borderRight: '1px solid #f0f0f0', borderBottom: '1px solid #eef2f6' }}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDownCapture={(e) => {
                      if (e.key === 'Enter' && (e.target as HTMLElement).getAttribute('role') !== 'option') {
                        e.preventDefault();
                        e.stopPropagation();
                        setTimeout(() => qtyInputRefs.current[line.id]?.focus(), 50);
                      }
                    }}
                  >
                    <TextField
                      size="small"
                      select
                      variant="outlined"
                      value={line.unitId}
                      onChange={(e) => handleUnitChange(line.id, e.target.value)}
                      onKeyDown={(e) => { handleGridArrowNavigation(e, line.id, unitInputRefs); handleUnitKeyDown(e, line.id); }}
                      fullWidth
                      disabled={line.availableUnits.length === 0}
                      inputRef={(el) => { unitInputRefs.current[line.id] = el; }}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: 1, '& fieldset': { borderColor: '#e2e8f0' } }, '& .MuiOutlinedInput-input': { py: 0.3, fontSize: '0.82rem' } }}
                    >
                      {line.availableUnits.length === 0 ? (
                        <MenuItem value="" sx={{ fontSize: '0.82rem' }}>-</MenuItem>
                      ) : (
                        line.availableUnits.map((u) => (
                          <MenuItem key={u.id} value={u.id} sx={{ fontSize: '0.82rem' }}>{u.name}</MenuItem>
                        ))
                      )}
                    </TextField>
                  </TableCell>
                  <TableCell align="right" sx={{ p: '3px', borderRight: '1px solid #f0f0f0', borderBottom: '1px solid #eef2f6' }}>
                    <TextField
                      size="small"
                      variant="outlined"
                      type="number"
                      value={editingNumericCell?.lineId === line.id && editingNumericCell?.field === 'quantity' ? editingNumericCell.value : (line.quantity === 0 ? '' : String(line.quantity))}
                      onFocus={(e) => { handleTextFieldFocus(e); setEditingNumericCell({ lineId: line.id, field: 'quantity', value: line.quantity === 0 ? '' : String(line.quantity) }); }}
                      onChange={(e) => setEditingNumericCell((prev) => prev?.lineId === line.id && prev?.field === 'quantity' ? { ...prev, value: e.target.value } : prev)}
                      onBlur={() => handleQtyBlur(line)}
                      onKeyDown={(e) => { handleGridArrowNavigation(e, line.id, qtyInputRefs); handleNumberKeyDown(e); handleQtyKeyDown(e, line); }}
                      inputRef={(el) => { qtyInputRefs.current[line.id] = el; }}
                      inputProps={{ min: 0, style: { textAlign: 'center', fontSize: '0.82rem' }, inputMode: 'decimal' }}
                      fullWidth
                      sx={{ ...numberInputStyle, '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: 1, '& fieldset': { borderColor: '#e2e8f0' } }, '& .MuiOutlinedInput-input': { py: 0.3 } }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ p: '3px', borderRight: '1px solid #f0f0f0', borderBottom: '1px solid #eef2f6' }}>
                    <TextField
                      size="small"
                      variant="outlined"
                      type="number"
                      value={editingNumericCell?.lineId === line.id && editingNumericCell?.field === 'price' ? editingNumericCell.value : (line.price === 0 ? '' : String(line.price))}
                      onFocus={(e) => { handleTextFieldFocus(e); setEditingNumericCell({ lineId: line.id, field: 'price', value: line.price === 0 ? '' : String(line.price) }); }}
                      onChange={(e) => setEditingNumericCell((prev) => prev?.lineId === line.id && prev?.field === 'price' ? { ...prev, value: e.target.value } : prev)}
                      onBlur={() => { const raw = editingNumericCell?.lineId === line.id && editingNumericCell?.field === 'price' ? editingNumericCell.value : ''; const num = parseFloat(parseNumericInput(raw).toFixed(2)); updateLine(line.id, 'price', num); setEditingNumericCell((prev) => (prev && prev.lineId === line.id && prev.field === 'price' ? null : prev)); }}
                      onKeyDown={(e) => { handleGridArrowNavigation(e, line.id, priceInputRefs); handleNumberKeyDown(e); handlePriceKeyDown(e, line); }}
                      inputRef={(el) => { priceInputRefs.current[line.id] = el; }}
                      inputProps={{ min: 0, style: { textAlign: 'right', fontSize: '0.82rem' }, inputMode: 'decimal' }}
                      fullWidth
                      sx={{ ...numberInputStyle, '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: 1, '& fieldset': { borderColor: '#e2e8f0' } }, '& .MuiOutlinedInput-input': { py: 0.3 } }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ p: '5px 6px', borderRight: '1px solid #f0f0f0', borderBottom: '1px solid #eef2f6', fontSize: '0.82rem', fontWeight: 500, color: '#475569' }}>{line.gross.toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ p: '3px', borderRight: '1px solid #f0f0f0', borderBottom: '1px solid #eef2f6' }}>
                    <TextField
                      size="small"
                      variant="outlined"
                      type="number"
                      value={editingNumericCell?.lineId === line.id && editingNumericCell?.field === 'discPercent' ? editingNumericCell.value : (line.discPercent === 0 ? '' : String(line.discPercent))}
                      onFocus={(e) => { handleTextFieldFocus(e); setEditingNumericCell({ lineId: line.id, field: 'discPercent', value: line.discPercent === 0 ? '' : String(line.discPercent) }); }}
                      onChange={(e) => setEditingNumericCell((prev) => prev?.lineId === line.id && prev?.field === 'discPercent' ? { ...prev, value: e.target.value } : prev)}
                      onBlur={() => { const raw = editingNumericCell?.lineId === line.id && editingNumericCell?.field === 'discPercent' ? editingNumericCell.value : ''; updateLine(line.id, 'discPercent', parseNumericInput(raw)); setEditingNumericCell((prev) => (prev && prev.lineId === line.id && prev.field === 'discPercent' ? null : prev)); }}
                      onKeyDown={(e) => { handleGridArrowNavigation(e, line.id, discPercentInputRefs); handleNumberKeyDown(e); handleDiscPercentKeyDown(e, line); }}
                      inputRef={(el) => { discPercentInputRefs.current[line.id] = el; }}
                      inputProps={{ min: 0, max: 100, style: { textAlign: 'center', fontSize: '0.82rem' }, inputMode: 'decimal' }}
                      fullWidth
                      sx={{ ...numberInputStyle, '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: 1, '& fieldset': { borderColor: '#e2e8f0' } }, '& .MuiOutlinedInput-input': { py: 0.3 } }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ p: '3px', borderRight: '1px solid #f0f0f0', borderBottom: '1px solid #eef2f6' }}>
                    <TextField
                      size="small"
                      variant="outlined"
                      type="number"
                      value={editingNumericCell?.lineId === line.id && editingNumericCell?.field === 'discAmount' ? editingNumericCell.value : (line.discAmount === 0 ? '' : String(line.discAmount))}
                      onFocus={(e) => { handleTextFieldFocus(e); setEditingNumericCell({ lineId: line.id, field: 'discAmount', value: line.discAmount === 0 ? '' : String(line.discAmount) }); }}
                      onChange={(e) => setEditingNumericCell((prev) => prev?.lineId === line.id && prev?.field === 'discAmount' ? { ...prev, value: e.target.value } : prev)}
                      onBlur={() => { const raw = editingNumericCell?.lineId === line.id && editingNumericCell?.field === 'discAmount' ? editingNumericCell.value : ''; updateLine(line.id, 'discAmount', parseNumericInput(raw)); setEditingNumericCell((prev) => (prev && prev.lineId === line.id && prev.field === 'discAmount' ? null : prev)); }}
                      onKeyDown={(e) => { handleGridArrowNavigation(e, line.id, discAmountInputRefs); handleNumberKeyDown(e); handleDiscAmountKeyDown(e, line); }}
                      inputRef={(el) => { discAmountInputRefs.current[line.id] = el; }}
                      inputProps={{ min: 0, style: { textAlign: 'right', fontSize: '0.82rem' }, inputMode: 'decimal' }}
                      fullWidth
                      sx={{ ...numberInputStyle, '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: 1, '& fieldset': { borderColor: '#e2e8f0' } }, '& .MuiOutlinedInput-input': { py: 0.3 } }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ p: '5px 6px', borderRight: '1px solid #f0f0f0', borderBottom: '1px solid #eef2f6', fontSize: '0.82rem', fontWeight: 500, color: '#64748b' }}>{line.vatAmount.toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ p: '5px 6px', borderRight: '1px solid #f0f0f0', borderBottom: '1px solid #eef2f6', fontWeight: 700, fontSize: '0.85rem', color: '#0f766e' }}>{line.total.toFixed(2)}</TableCell>
                  <TableCell sx={{ p: '3px', borderBottom: '1px solid #eef2f6', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <IconButton size="small" onClick={() => removeLine(line.id)} sx={{ p: 0.3, color: '#ef4444', '&:hover': { bgcolor: '#fee2e2' } }}>
                      <DeleteIcon sx={{ fontSize: '0.85rem' }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Bottom - B2C style: Adjustments + Grand Total */}
      <Paper elevation={0} sx={{ p: 2, mb: 1, borderRadius: 2, bgcolor: 'white', border: '1px solid #e0e7ef' }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={5} lg={3.5}>
            <Box sx={{ bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', p: 1.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#475569', mb: 1.2, letterSpacing: 0.3, textTransform: 'uppercase' }}>Adjustments</Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <TextField size="small" label="Other Disc %" type="number" value={editingNumericCell?.field === 'otherDiscPercent' && editingNumericCell.lineId === undefined ? editingNumericCell.value : (otherDiscPercent === 0 ? '' : String(otherDiscPercent))} onFocus={(e) => { handleTextFieldFocus(e); setEditingNumericCell({ field: 'otherDiscPercent', value: otherDiscPercent === 0 ? '' : String(otherDiscPercent) }); }} onChange={(e) => setEditingNumericCell((prev) => prev?.field === 'otherDiscPercent' ? { ...prev, value: e.target.value } : prev)} onBlur={() => { const raw = editingNumericCell?.field === 'otherDiscPercent' ? editingNumericCell.value : ''; handleOtherDiscPercentChange(parseNumericInput(raw)); setEditingNumericCell((prev) => (prev?.field === 'otherDiscPercent' ? null : prev)); }} onKeyDown={handleNumberKeyDown} inputProps={{ inputMode: 'decimal', max: 100 }} InputLabelProps={{ shrink: true }} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField size="small" label="Other Discount on Sales" type="number" value={editingNumericCell?.field === 'otherDiscount' && editingNumericCell.lineId === undefined ? editingNumericCell.value : (otherDiscount === 0 ? '' : String(otherDiscount))} onFocus={(e) => { handleTextFieldFocus(e); setEditingNumericCell({ field: 'otherDiscount', value: otherDiscount === 0 ? '' : String(otherDiscount) }); }} onChange={(e) => setEditingNumericCell((prev) => prev?.field === 'otherDiscount' ? { ...prev, value: e.target.value } : prev)} onBlur={() => { const raw = editingNumericCell?.field === 'otherDiscount' ? editingNumericCell.value : ''; setOtherDiscount(parseNumericInput(raw)); setOtherDiscPercent(0); setEditingNumericCell((prev) => (prev?.field === 'otherDiscount' ? null : prev)); }} onKeyDown={handleNumberKeyDown} inputProps={{ inputMode: 'decimal' }} InputLabelProps={{ shrink: true }} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField size="small" label="Other Charges on Sales" type="number" value={editingNumericCell?.field === 'otherCharges' && editingNumericCell.lineId === undefined ? editingNumericCell.value : (otherCharges === 0 ? '' : String(otherCharges))} onFocus={(e) => { handleTextFieldFocus(e); setEditingNumericCell({ field: 'otherCharges', value: otherCharges === 0 ? '' : String(otherCharges) }); }} onChange={(e) => setEditingNumericCell((prev) => prev?.field === 'otherCharges' ? { ...prev, value: e.target.value } : prev)} onBlur={() => { const raw = editingNumericCell?.field === 'otherCharges' ? editingNumericCell.value : ''; setOtherCharges(parseNumericInput(raw)); setEditingNumericCell((prev) => (prev?.field === 'otherCharges' ? null : prev)); }} onKeyDown={handleNumberKeyDown} inputProps={{ inputMode: 'decimal' }} InputLabelProps={{ shrink: true }} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField size="small" label="Freight Charge on Sales" type="number" value={editingNumericCell?.field === 'freightCharge' && editingNumericCell.lineId === undefined ? editingNumericCell.value : (freightCharge === 0 ? '' : String(freightCharge))} onFocus={(e) => { handleTextFieldFocus(e); setEditingNumericCell({ field: 'freightCharge', value: freightCharge === 0 ? '' : String(freightCharge) }); }} onChange={(e) => setEditingNumericCell((prev) => prev?.field === 'freightCharge' ? { ...prev, value: e.target.value } : prev)} onBlur={() => { const raw = editingNumericCell?.field === 'freightCharge' ? editingNumericCell.value : ''; setFreightCharge(parseNumericInput(raw)); setEditingNumericCell((prev) => (prev?.field === 'freightCharge' ? null : prev)); }} onKeyDown={handleNumberKeyDown} inputProps={{ inputMode: 'decimal' }} InputLabelProps={{ shrink: true }} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField size="small" label="Travel on Sales" type="number" value={editingNumericCell?.field === 'lendAddLess' && editingNumericCell.lineId === undefined ? editingNumericCell.value : (lendAddLess === 0 ? '' : String(lendAddLess))} onFocus={(e) => { handleTextFieldFocus(e); setEditingNumericCell({ field: 'lendAddLess', value: lendAddLess === 0 ? '' : String(lendAddLess) }); }} onChange={(e) => setEditingNumericCell((prev) => prev?.field === 'lendAddLess' ? { ...prev, value: e.target.value } : prev)} onBlur={() => { const raw = editingNumericCell?.field === 'lendAddLess' ? editingNumericCell.value : ''; setLendAddLess(parseNumericInput(raw)); setEditingNumericCell((prev) => (prev?.field === 'lendAddLess' ? null : prev)); }} onKeyDown={handleNumberKeyDown} inputProps={{ inputMode: 'decimal' }} InputLabelProps={{ shrink: true }} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField size="small" label="Round Off on Sales" type="number" value={editingNumericCell?.field === 'roundOff' && editingNumericCell.lineId === undefined ? editingNumericCell.value : (roundOff === 0 ? '' : String(roundOff))} onFocus={(e) => { handleTextFieldFocus(e); setEditingNumericCell({ field: 'roundOff', value: roundOff === 0 ? '' : String(roundOff) }); }} onChange={(e) => setEditingNumericCell((prev) => prev?.field === 'roundOff' ? { ...prev, value: e.target.value } : prev)} onBlur={() => { const raw = editingNumericCell?.field === 'roundOff' ? editingNumericCell.value : ''; setRoundOff(parseNumericInput(raw)); setEditingNumericCell((prev) => (prev?.field === 'roundOff' ? null : prev)); }} onKeyDown={handleNumberKeyDown} inputProps={{ inputMode: 'decimal' }} InputLabelProps={{ shrink: true }} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
                </Grid>
                <Grid item xs={12}>
                  <TextField size="small" label="Narration" value={narration} onChange={(e) => setNarration(e.target.value)} inputRef={narrationRef} onFocus={handleTextFieldFocus} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setTimeout(() => saveButtonRef.current?.focus(), 50); } }} InputLabelProps={{ shrink: true }} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
                </Grid>
              </Grid>
            </Box>
          </Grid>
          <Grid item xs={12} md={3.5} lg={5}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <Box sx={{ background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)', borderRadius: 2, p: 2, mb: 1.5, textAlign: 'center' }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', mb: 0.3 }}>Grand Total</Typography>
                <Typography sx={{ color: 'white', fontWeight: 900, fontSize: '2.2rem', lineHeight: 1.1, letterSpacing: -0.5 }}>{calculations.grandTotal.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', p: 1.5, flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography sx={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>This Bill</Typography>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>{calculations.subTotal.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography sx={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>Before tax (incl. adjustments)</Typography>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>{(calculations.grandTotal - calculations.totalVat).toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography sx={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>Total VAT</Typography>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>{calculations.totalVat.toFixed(2)}</Typography>
                </Box>
                {[
                  { label: 'Other Discount on Sales', value: otherDiscount },
                  { label: 'Other Charges on Sales', value: otherCharges },
                  { label: 'Freight Charge on Sales', value: freightCharge },
                  { label: 'Travel on Sales', value: lendAddLess },
                  { label: 'Round Off on Sales', value: roundOff },
                ].map((item) => (
                  <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.2 }}>
                    <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>{item.label}</Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>{item.value.toFixed(2)}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Action buttons - B2C style */}
      <Paper elevation={0} sx={{ p: 1.5, width: '100%', borderRadius: 2, bgcolor: 'white', border: '1px solid #e0e7ef' }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            ref={saveButtonRef}
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => setSaveDialogOpen(true)}
            disabled={loading || (returnType === 'ByRef' && !originalInvoiceIdForReturn)}
            sx={{ minWidth: 100, py: 0.8, fontSize: '0.82rem', fontWeight: 600, textTransform: 'none', borderRadius: 1.5, boxShadow: 'none', bgcolor: '#16a34a', color: '#fff', '&:hover': { bgcolor: '#15803d' }, '&.Mui-disabled': { bgcolor: '#d1d5db', color: '#9ca3af' } }}
          >
            Save
          </Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
            disabled={lines.filter((l) => l.productId && l.quantity > 0).length === 0}
            sx={{ minWidth: 100, py: 0.8, fontSize: '0.82rem', fontWeight: 600, textTransform: 'none', borderRadius: 1.5, boxShadow: 'none', bgcolor: '#16a34a', color: '#fff', '&:hover': { bgcolor: '#15803d' }, '&.Mui-disabled': { bgcolor: '#d1d5db', color: '#9ca3af' } }}
          >
            Print
          </Button>
          <Button
            variant="contained"
            startIcon={<ClearIcon />}
            onClick={handleClear}
            sx={{ minWidth: 100, py: 0.8, fontSize: '0.82rem', fontWeight: 600, textTransform: 'none', borderRadius: 1.5, boxShadow: 'none', bgcolor: '#16a34a', color: '#fff', '&:hover': { bgcolor: '#15803d' } }}
          >
            Clear
          </Button>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => { if (returnId) setEditConfirmOpen(true); }}
            disabled={!returnId || loading}
            sx={{ minWidth: 90, py: 0.8, fontSize: '0.82rem', fontWeight: 600, textTransform: 'none', borderRadius: 1.5, boxShadow: 'none', bgcolor: '#16a34a', color: '#fff', '&:hover': { bgcolor: '#15803d' }, '&.Mui-disabled': { bgcolor: '#d1d5db', color: '#9ca3af' } }}
          >
            Edit
          </Button>
          <Button
            variant="contained"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
            disabled={!returnId}
            sx={{ minWidth: 100, py: 0.8, fontSize: '0.82rem', fontWeight: 600, textTransform: 'none', borderRadius: 1.5, boxShadow: 'none', bgcolor: '#16a34a', color: '#fff', '&:hover': { bgcolor: '#15803d' }, '&.Mui-disabled': { bgcolor: '#d1d5db', color: '#9ca3af' } }}
          >
            Delete
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={() => setSearchDialogOpen(true)}
            sx={{ minWidth: 140, py: 0.8, fontSize: '0.82rem', fontWeight: 600, textTransform: 'none', borderRadius: 1.5, boxShadow: 'none', bgcolor: '#16a34a', color: '#fff', '&:hover': { bgcolor: '#15803d' } }}
          >
            Search Return
          </Button>
        </Box>
      </Paper>

      {/* Saved Success Dialog */}
      <Dialog open={savedDialogOpen} onClose={() => setSavedDialogOpen(false)} PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', color: '#15803d' }}>Success</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.9rem', color: '#475569' }}>{savedDialogMessage}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button variant="contained" onClick={() => setSavedDialogOpen(false)} sx={{ textTransform: 'none', borderRadius: 1.5, bgcolor: '#0f766e', '&:hover': { bgcolor: '#115e59' }, boxShadow: 'none' }}>
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={errorDialogOpen} onClose={() => setErrorDialogOpen(false)} PaperProps={{ sx: { borderRadius: 2, minWidth: 350 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', color: '#dc2626' }}>Error</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.9rem', color: '#475569' }}>{errorDialogMessage}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button variant="contained" onClick={() => setErrorDialogOpen(false)} sx={{ textTransform: 'none', borderRadius: 1.5, bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' }, boxShadow: 'none' }}>
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>Save Sales Return</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.9rem', color: '#475569' }}>Do you want to save this sales return?</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setSaveDialogOpen(false)} sx={{ textTransform: 'none', borderRadius: 1.5, color: '#64748b' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} sx={{ textTransform: 'none', borderRadius: 1.5, bgcolor: '#0f766e', '&:hover': { bgcolor: '#115e59' }, boxShadow: 'none' }}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Confirmation Dialog - update current return (same behaviour as Sales B2C Edit) */}
      <Dialog open={editConfirmOpen} onClose={() => setEditConfirmOpen(false)} disableRestoreFocus PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>Edit Sales Return</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.9rem', color: '#475569' }}>Do you want to update this sales return?</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setEditConfirmOpen(false)} sx={{ textTransform: 'none', borderRadius: 1.5, color: '#64748b' }}>Cancel</Button>
          <Button variant="contained" data-confirm-btn onClick={handleEditConfirm} sx={{ textTransform: 'none', borderRadius: 1.5, bgcolor: '#0f766e', '&:hover': { bgcolor: '#115e59' }, boxShadow: 'none' }}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Success Dialog */}
      <Dialog open={editSuccessDialogOpen} onClose={() => { setEditSuccessDialogOpen(false); handleClear(); }} disableRestoreFocus PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', color: '#15803d' }}>Updated Successfully</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.9rem', color: '#475569' }}>Sales return has been updated successfully.</Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 1 }}>Return No: {invoiceNo}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button variant="contained" onClick={() => { setEditSuccessDialogOpen(false); handleClear(); }} sx={{ textTransform: 'none', borderRadius: 1.5, bgcolor: '#0f766e', '&:hover': { bgcolor: '#115e59' }, boxShadow: 'none' }}>
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Search Return Dialog - find by return number */}
      <Dialog open={searchDialogOpen} onClose={() => { setSearchDialogOpen(false); setSearchError(''); }} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>Search Sales Return</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Return No"
            value={searchInvoiceNo}
            onChange={(e) => setSearchInvoiceNo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            error={!!searchError}
            helperText={searchError}
            placeholder="e.g. SR-000001"
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setSearchDialogOpen(false)} sx={{ textTransform: 'none', borderRadius: 1.5, color: '#64748b' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSearch} disabled={searchLoading} sx={{ textTransform: 'none', borderRadius: 1.5, bgcolor: '#0f766e', '&:hover': { bgcolor: '#115e59' } }}>
            {searchLoading ? 'Loading...' : 'Search'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', color: '#dc2626' }}>Delete Sales Return</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.9rem', color: '#475569' }}>Are you sure you want to delete this sales return? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ textTransform: 'none', borderRadius: 1.5, color: '#64748b' }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} sx={{ textTransform: 'none', borderRadius: 1.5, boxShadow: 'none' }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Select items from invoice - B2C style */}
      <Dialog open={selectItemsDialogOpen} onClose={() => setSelectItemsDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2, border: '1px solid #e2e8f0' } }}>
        <DialogTitle sx={{ fontWeight: 700, color: '#0f766e', borderBottom: '1px solid #e2e8f0', pb: 1.5 }}>Select items to return</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {refInvoiceData && (
            <>
              <Box sx={{ mb: 2 }}>
                <MuiFormControlLabel
                  control={<Checkbox checked={selectedRefItemIds.size === refInvoiceData.items.length} onChange={(e) => selectAllRefItems(e.target.checked)} />}
                  label="Select All"
                  sx={{ '& .MuiFormControlLabel-label': { fontWeight: 600, color: '#475569' } }}
                />
              </Box>
              <TableContainer sx={{ maxHeight: 360, border: '1px solid #e2e8f0', borderRadius: 1.5, overflow: 'hidden' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" sx={{ bgcolor: '#0f766e', color: 'white', fontWeight: 600, fontSize: '0.75rem' }}></TableCell>
                      <TableCell sx={{ bgcolor: '#0f766e', color: 'white', fontWeight: 600, fontSize: '0.75rem' }}>Item</TableCell>
                      <TableCell align="right" sx={{ bgcolor: '#0f766e', color: 'white', fontWeight: 600, fontSize: '0.75rem' }}>Qty</TableCell>
                      <TableCell align="right" sx={{ bgcolor: '#0f766e', color: 'white', fontWeight: 600, fontSize: '0.75rem' }}>Price</TableCell>
                      <TableCell align="right" sx={{ bgcolor: '#0f766e', color: 'white', fontWeight: 600, fontSize: '0.75rem' }}>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {refInvoiceData.items.map((it) => {
                      const name = typeof it.productId === 'object' && (it.productId as { name?: string }).name ? (it.productId as { name: string }).name : (it.description || '');
                      return (
                        <TableRow key={it._id} hover onClick={() => toggleRefItem(it._id)} sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f0fdfa' } }}>
                          <TableCell padding="checkbox">
                            <Checkbox checked={selectedRefItemIds.has(it._id)} onChange={() => toggleRefItem(it._id)} sx={{ color: '#0f766e', '&.Mui-checked': { color: '#0f766e' } }} />
                          </TableCell>
                          <TableCell>{name}</TableCell>
                          <TableCell align="right">{it.quantity}</TableCell>
                          <TableCell align="right">{it.unitPrice?.toFixed(2)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, color: '#0f766e' }}>{it.totalAmount?.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f0fdfa', borderRadius: 1.5, border: '1px solid #99f6e4' }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0f766e' }}>Selected Total: {selectedRefTotal.toFixed(2)}</Typography>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
          <Button onClick={() => setSelectItemsDialogOpen(false)} sx={{ textTransform: 'none', borderRadius: 1.5 }}>Cancel</Button>
          <Button variant="contained" onClick={confirmSelectRefItems} sx={{ textTransform: 'none', borderRadius: 1.5, bgcolor: '#0f766e', '&:hover': { bgcolor: '#115e59' } }}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Batch Selection Dialog - same as Sales B2C */}
      <Dialog
        open={batchDialogOpen}
        onClose={handleBatchDialogClose}
        onKeyDown={handleBatchDialogKeyDown}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>Select Batch</Typography>
          {pendingProductSelection && (
            <Typography sx={{ fontSize: '0.82rem', color: '#64748b', mt: 0.3 }}>{pendingProductSelection.product.name}</Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <TableContainer sx={{ maxHeight: 300 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {['Batch No', 'Expiry Date', 'Stock', 'P.Rate', 'Retail', 'Action'].map((label, ci) => (
                    <TableCell key={ci} align={ci >= 2 && ci <= 4 ? 'right' : ci === 5 ? 'center' : 'left'}
                      sx={{ bgcolor: '#f0fdfa', fontWeight: 600, fontSize: '0.72rem', color: '#0f766e', py: 1, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                      {label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {availableBatches.map((batch, index) => (
                  <TableRow
                    key={batch.batchNumber}
                    ref={(el) => { batchRowRefs.current[index] = el; }}
                    hover
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { bgcolor: '#f0fdfa' },
                      bgcolor: index === focusedBatchIndex ? '#ccfbf1 !important' : (index % 2 === 0 ? '#ffffff' : '#fafafa'),
                      outline: index === focusedBatchIndex ? '2px solid #0f766e' : 'none',
                      transition: 'all 0.1s',
                    }}
                    onClick={() => handleBatchSelect(batch)}
                  >
                    <TableCell sx={{ fontSize: '0.8rem', color: '#334155', py: 0.75 }}>
                      {batch.batchNumber.length > 15 ? batch.batchNumber.substring(0, 15) + '...' : batch.batchNumber}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: '#475569', py: 0.75 }}>{batch.expiryDate || '-'}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.8rem', color: '#1e293b', py: 0.75, fontWeight: 600 }}>{batch.quantity}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.8rem', color: '#64748b', py: 0.75 }}>{batch.purchasePrice.toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.8rem', color: '#1e293b', py: 0.75, fontWeight: 600 }}>{batch.retail.toFixed(2)}</TableCell>
                    <TableCell align="center" sx={{ py: 0.75 }}>
                      <Button size="small" variant="contained"
                        onClick={(e) => { e.stopPropagation(); handleBatchSelect(batch); }}
                        sx={{ minWidth: 'auto', px: 1.5, py: 0.25, fontSize: '0.7rem', borderRadius: 1, boxShadow: 'none', bgcolor: '#0f766e', '&:hover': { bgcolor: '#115e59' } }}>
                        Select
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', px: 2, py: 1 }}>
          <Button onClick={handleBatchDialogClose} sx={{ textTransform: 'none', borderRadius: 1.5, color: '#64748b' }}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

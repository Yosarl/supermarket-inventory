import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import {
  Box, Button, TextField, Typography, Paper, Table, TableBody, TableCell,
  TableHead, TableRow, MenuItem, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Checkbox, Chip, Divider, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useAppSelector } from '../store/hooks';
import { voucherApi, ledgerAccountApi, billReferenceApi, OutstandingBill } from '../services/api';

type Account = { _id: string; name: string; code: string; type: string };

const VOUCHER_TYPES = ['Receipt', 'Payment', 'Journal', 'ChequePayment', 'ChequeReceipt'] as const;
const VOUCHER_LABELS: Record<string, string> = {
  Receipt: 'Receipt',
  Payment: 'Payment',
  Journal: 'Journal',
  ChequePayment: 'Cheque Payment',
  ChequeReceipt: 'Cheque Receipt',
};

interface BillSettlement {
  billNumber: string;
  date: string;
  totalAmount: number;
  outstandingAmount: number;
  settleAmount: number;
  selected: boolean;
  drCr: 'Dr' | 'Cr';
  ledgerAccountId: string;
}

export default function VoucherEntry({
  defaultVoucherType = 'Receipt',
}: {
  defaultVoucherType?: string;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successDialogMessage, setSuccessDialogMessage] = useState('');
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDialogMessage, setErrorDialogMessage] = useState('');
  const companyId = useAppSelector((s) => s.app.selectedCompanyId);
  const financialYearId = useAppSelector((s) => s.app.selectedFinancialYearId);

  // Bill reference state
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [billDialogLineIndex, setBillDialogLineIndex] = useState<number | null>(null);
  const [outstandingBills, setOutstandingBills] = useState<OutstandingBill[]>([]);
  const [settlements, setSettlements] = useState<BillSettlement[]>([]);
  // Map of lineIndex → array of settled bills
  const [lineSettlements, setLineSettlements] = useState<Record<number, BillSettlement[]>>({});

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
  } = useForm<{
    voucherType: string;
    date: string;
    narration: string;
    lines: Array<{
      ledgerAccountId: string;
      debitAmount: number;
      creditAmount: number;
      narration: string;
    }>;
  }>({
    defaultValues: {
      voucherType: defaultVoucherType,
      date: new Date().toISOString().slice(0, 10),
      narration: '',
      lines: [
        { ledgerAccountId: '', debitAmount: 0, creditAmount: 0, narration: '' },
        { ledgerAccountId: '', debitAmount: 0, creditAmount: 0, narration: '' },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const watchedVoucherType = watch('voucherType');
  const watchedLines = watch('lines');

  useEffect(() => {
    if (!companyId) return;
    ledgerAccountApi
      .list(companyId)
      .then((res) => setAccounts((res.data.data as Account[]) ?? []));
  }, [companyId]);

  const isPaymentType = watchedVoucherType === 'Payment' || watchedVoucherType === 'ChequePayment';
  const isReceiptType = watchedVoucherType === 'Receipt' || watchedVoucherType === 'ChequeReceipt';
  const showBillRef = isPaymentType || isReceiptType;

  // Load outstanding bills for a given account
  const loadOutstandingBills = useCallback(
    async (ledgerAccountId: string) => {
      if (!companyId) return;
      try {
        const res = await billReferenceApi.getOutstanding(companyId, ledgerAccountId);
        setOutstandingBills(res.data.data || []);
      } catch {
        setOutstandingBills([]);
      }
    },
    [companyId]
  );

  // Open bill reference dialog for a specific line
  const openBillDialog = async (lineIndex: number) => {
    const ledgerAccountId = watchedLines[lineIndex]?.ledgerAccountId;
    if (!ledgerAccountId) {
      setErrorDialogMessage('Please select an account first.');
      setErrorDialogOpen(true);
      return;
    }

    setBillDialogLineIndex(lineIndex);
    await loadOutstandingBills(ledgerAccountId);

    // Restore previous settlement selections for this line
    setBillDialogOpen(true);

    // Will be set in useEffect below after outstandingBills loads
    setTimeout(() => {
      setSettlements(prev => {
        // If we already have state, keep it
        if (prev.length > 0) return prev;
        return [];
      });
    }, 0);
  };

  // Update settlements when outstanding bills load
  useEffect(() => {
    if (!billDialogOpen || billDialogLineIndex === null) return;
    const existing = lineSettlements[billDialogLineIndex] || [];
    const existingMap = new Map(existing.map((s) => [s.billNumber, s]));

    const newSettlements: BillSettlement[] = outstandingBills.map((bill) => {
      const prev = existingMap.get(bill.billNumber);
      return {
        billNumber: bill.billNumber,
        date: bill.date,
        totalAmount: bill.totalAmount,
        outstandingAmount: bill.outstandingAmount,
        settleAmount: prev?.settleAmount ?? 0,
        selected: prev?.selected ?? false,
        drCr: bill.drCr,
        ledgerAccountId: watchedLines[billDialogLineIndex]?.ledgerAccountId || '',
      };
    });
    setSettlements(newSettlements);
  }, [outstandingBills, billDialogOpen, billDialogLineIndex]);

  // Toggle selection of a bill
  const toggleBillSelection = (index: number) => {
    setSettlements((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        const newSelected = !s.selected;
        return {
          ...s,
          selected: newSelected,
          settleAmount: newSelected ? s.outstandingAmount : 0,
        };
      })
    );
  };

  // Update settle amount for a specific bill
  const updateSettleAmount = (index: number, amount: number) => {
    setSettlements((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        const clamped = Math.max(0, Math.min(amount, s.outstandingAmount));
        return { ...s, settleAmount: clamped, selected: clamped > 0 };
      })
    );
  };

  // Confirm bill settlements
  const confirmSettlements = () => {
    if (billDialogLineIndex === null) return;
    const selected = settlements.filter((s) => s.selected && s.settleAmount > 0);

    // Save to lineSettlements map
    setLineSettlements((prev) => ({
      ...prev,
      [billDialogLineIndex]: selected,
    }));

    // Auto-fill the debit/credit amount for the line based on total settlement
    const totalSettle = selected.reduce((sum, s) => sum + s.settleAmount, 0);
    if (totalSettle > 0) {
      if (isReceiptType) {
        // Receipt: money coming in → Credit the customer account
        setValue(`lines.${billDialogLineIndex}.creditAmount`, parseFloat(totalSettle.toFixed(2)));
      } else if (isPaymentType) {
        // Payment: money going out → Debit the supplier account
        setValue(`lines.${billDialogLineIndex}.debitAmount`, parseFloat(totalSettle.toFixed(2)));
      }
    }

    setBillDialogOpen(false);
  };

  const onSubmit = async (data: {
    voucherType: string;
    date: string;
    narration: string;
    lines: Array<{
      ledgerAccountId: string;
      debitAmount: number;
      creditAmount: number;
      narration: string;
    }>;
  }) => {
    if (!companyId || !financialYearId) return;
    const lines = data.lines
      .filter(
        (l) =>
          l.ledgerAccountId &&
          (Number(l.debitAmount) > 0 || Number(l.creditAmount) > 0)
      )
      .map((l) => ({
        ledgerAccountId: l.ledgerAccountId,
        debitAmount: Number(l.debitAmount) || 0,
        creditAmount: Number(l.creditAmount) || 0,
        narration: l.narration,
      }));
    if (lines.length < 2) {
      setErrorDialogMessage('Add at least 2 lines. Debits must equal credits.');
      setErrorDialogOpen(true);
      return;
    }
    try {
      const voucherRes = await voucherApi.create({
        companyId,
        financialYearId,
        voucherType: data.voucherType,
        date: data.date,
        narration: data.narration,
        lines,
      });

      const voucherId = (voucherRes.data.data as { _id: string })?._id;

      // Settle bills (Agst Ref) if any were selected
      if (voucherId && showBillRef) {
        const allSettlements: Array<{
          ledgerAccountId: string;
          billNumber: string;
          amount: number;
          drCr: 'Dr' | 'Cr';
          narration?: string;
        }> = [];

        for (const [, bills] of Object.entries(lineSettlements)) {
          for (const bill of bills) {
            if (bill.selected && bill.settleAmount > 0) {
              allSettlements.push({
                ledgerAccountId: bill.ledgerAccountId,
                billNumber: bill.billNumber,
                amount: bill.settleAmount,
                // Agst Ref is the opposite of New Ref:
                // New Ref Dr (receivable) → Agst Ref Cr (received)
                // New Ref Cr (payable) → Agst Ref Dr (paid)
                drCr: bill.drCr === 'Dr' ? 'Cr' : 'Dr',
                narration: `${data.voucherType} against ${bill.billNumber}`,
              });
            }
          }
        }

        if (allSettlements.length > 0) {
          try {
            await billReferenceApi.settle({
              companyId,
              financialYearId,
              voucherId,
              date: data.date,
              settlements: allSettlements,
            });
          } catch (e) {
            console.error('Bill settlement failed:', e);
          }
        }
      }

      // Reset settlements
      setLineSettlements({});
      setSuccessDialogMessage('Voucher posted.');
      setSuccessDialogOpen(true);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setErrorDialogMessage(err?.response?.data?.message ?? 'Failed');
      setErrorDialogOpen(true);
    }
  };

  if (!companyId)
    return <Typography color="error">Select a company first.</Typography>;
  if (!financialYearId)
    return <Typography color="error">Select a financial year first.</Typography>;

  // Helper to get settled bills count for a line
  const getSettledCount = (lineIndex: number) => {
    const bills = lineSettlements[lineIndex];
    if (!bills) return 0;
    return bills.filter((b) => b.selected && b.settleAmount > 0).length;
  };

  const getSettledTotal = (lineIndex: number) => {
    const bills = lineSettlements[lineIndex];
    if (!bills) return 0;
    return bills
      .filter((b) => b.selected && b.settleAmount > 0)
      .reduce((sum, b) => sum + b.settleAmount, 0);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Voucher Entry
      </Typography>
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <TextField
              select
              label="Type"
              {...register('voucherType')}
              size="small"
              sx={{ minWidth: 140 }}
            >
              {VOUCHER_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {VOUCHER_LABELS[t] ?? t}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="date"
              label="Date"
              {...register('date', { required: true })}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Narration"
              {...register('narration')}
              size="small"
              sx={{ minWidth: 280 }}
            />
          </Box>

          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                <TableCell sx={{ fontWeight: 700 }}>Account</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Debit (AED)
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Credit (AED)
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Narration</TableCell>
                {showBillRef && (
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>
                    Ref
                  </TableCell>
                )}
                <TableCell width={50} />
              </TableRow>
            </TableHead>
            <TableBody>
              {fields.map((f, i) => {
                const settled = getSettledCount(i);
                const settledAmt = getSettledTotal(i);
                const acct = accounts.find(
                  (a) => a._id === watchedLines[i]?.ledgerAccountId
                );
                const isPartyAccount =
                  acct?.type === 'Customer' || acct?.type === 'Supplier';

                return (
                  <TableRow key={f.id}>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        fullWidth
                        {...register(`lines.${i}.ledgerAccountId`)}
                      >
                        <MenuItem value="">Select</MenuItem>
                        {accounts.map((a) => (
                          <MenuItem key={a._id} value={a._id}>
                            {a.code} - {a.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        {...register(`lines.${i}.debitAmount`, {
                          valueAsNumber: true,
                        })}
                        inputProps={{ min: 0, step: 0.01 }}
                        sx={{ width: 110 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        {...register(`lines.${i}.creditAmount`, {
                          valueAsNumber: true,
                        })}
                        inputProps={{ min: 0, step: 0.01 }}
                        sx={{ width: 110 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        {...register(`lines.${i}.narration`)}
                        fullWidth
                      />
                    </TableCell>
                    {showBillRef && (
                      <TableCell sx={{ textAlign: 'center' }}>
                        {isPartyAccount && (
                          <Tooltip
                            title={
                              settled > 0
                                ? `${settled} bill(s), AED ${settledAmt.toFixed(2)}`
                                : 'Set Bill References'
                            }
                          >
                            <IconButton
                              size="small"
                              onClick={() => openBillDialog(i)}
                              color={settled > 0 ? 'success' : 'default'}
                            >
                              <ReceiptLongIcon fontSize="small" />
                              {settled > 0 && (
                                <Chip
                                  label={settled}
                                  size="small"
                                  color="success"
                                  sx={{
                                    position: 'absolute',
                                    top: -4,
                                    right: -8,
                                    height: 16,
                                    fontSize: '0.6rem',
                                    '& .MuiChip-label': { px: 0.5 },
                                  }}
                                />
                              )}
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => {
                          remove(i);
                          // Clean up settlements for removed line
                          setLineSettlements((prev) => {
                            const next = { ...prev };
                            delete next[i];
                            return next;
                          });
                        }}
                        disabled={fields.length <= 2}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <Button
            startIcon={<AddIcon />}
            onClick={() =>
              append({
                ledgerAccountId: '',
                debitAmount: 0,
                creditAmount: 0,
                narration: '',
              })
            }
            sx={{ mt: 1 }}
          >
            Add line
          </Button>
          <Box sx={{ mt: 2 }}>
            <Button type="submit" variant="contained">
              Post Voucher
            </Button>
          </Box>
        </form>
      </Paper>

      {/* ── Bill Reference Dialog ── */}
      <Dialog
        open={billDialogOpen}
        onClose={() => setBillDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            bgcolor: '#0f172a',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <ReceiptLongIcon />
          Bill-wise Settlement (Against Reference)
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {settlements.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No outstanding bills found for this account.
              </Typography>
            </Box>
          ) : (
            <>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#e2e8f0' }}>
                    <TableCell padding="checkbox" />
                    <TableCell sx={{ fontWeight: 700 }}>Bill No.</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Total
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Outstanding
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Settle Amount
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {settlements.map((s, idx) => (
                    <TableRow
                      key={s.billNumber}
                      sx={{
                        bgcolor: s.selected ? '#f0fdf4' : undefined,
                        '&:hover': { bgcolor: '#f8fafc' },
                      }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={s.selected}
                          onChange={() => toggleBillSelection(idx)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            fontWeight: 600,
                            color: s.drCr === 'Dr' ? '#059669' : '#dc2626',
                          }}
                        >
                          {s.billNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>{s.date}</TableCell>
                      <TableCell align="right">
                        {s.totalAmount.toFixed(2)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 600, color: '#dc2626' }}
                      >
                        {s.outstandingAmount.toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={s.settleAmount || ''}
                          onChange={(e) =>
                            updateSettleAmount(idx, parseFloat(e.target.value) || 0)
                          }
                          disabled={!s.selected}
                          inputProps={{
                            min: 0,
                            max: s.outstandingAmount,
                            step: 0.01,
                          }}
                          sx={{ width: 120 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={s.drCr === 'Dr' ? 'Receivable' : 'Payable'}
                          size="small"
                          color={s.drCr === 'Dr' ? 'success' : 'error'}
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Divider />
              <Box
                sx={{
                  p: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  bgcolor: '#f8fafc',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {settlements.filter((s) => s.selected).length} bill(s) selected
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  Total:{' '}
                  <span style={{ color: '#059669' }}>
                    AED{' '}
                    {settlements
                      .filter((s) => s.selected)
                      .reduce((sum, s) => sum + s.settleAmount, 0)
                      .toFixed(2)}
                  </span>
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setBillDialogOpen(false)}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmSettlements}
            variant="contained"
            sx={{
              textTransform: 'none',
              bgcolor: '#059669',
              '&:hover': { bgcolor: '#047857' },
            }}
          >
            Confirm Settlement
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Dialog */}
      <Dialog
        open={successDialogOpen}
        onClose={() => setSuccessDialogOpen(false)}
      >
        <DialogTitle sx={{ color: '#16a34a' }}>Success</DialogTitle>
        <DialogContent>
          <Typography>{successDialogMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setSuccessDialogOpen(false)}
            autoFocus
            variant="contained"
            sx={{
              bgcolor: '#16a34a',
              '&:hover': { bgcolor: '#15803d' },
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={errorDialogOpen} onClose={() => setErrorDialogOpen(false)}>
        <DialogTitle sx={{ color: '#dc2626' }}>Error</DialogTitle>
        <DialogContent>
          <Typography>{errorDialogMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setErrorDialogOpen(false)}
            autoFocus
            variant="contained"
            sx={{
              bgcolor: '#dc2626',
              '&:hover': { bgcolor: '#b91c1c' },
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

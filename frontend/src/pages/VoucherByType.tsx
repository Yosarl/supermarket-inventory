import { useParams } from 'react-router-dom';
import VoucherEntry from './VoucherEntry';

const typeMap: Record<string, string> = {
  receipt: 'Receipt',
  payment: 'Payment',
  journal: 'Journal',
  'cheque-payment': 'ChequePayment',
  'cheque-receipt': 'ChequeReceipt',
};

export default function VoucherByType() {
  const { type } = useParams<{ type: string }>();
  const defaultType = type ? typeMap[type] ?? 'Receipt' : 'Receipt';
  return <VoucherEntry defaultVoucherType={defaultType} />;
}

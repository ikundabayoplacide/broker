import { TransactionConfig } from '@/components/models/TransactionModal';

interface Transaction {
  id: string;
  type: string;
  status: string;
  quantity: number;
  executedPrice: string;
  totalAmount: string;
  createdAt: string;
  company: { name: string; symbol: string };
}

export const generateTransactionStatement = (
  transactions: Transaction[],
  config: TransactionConfig,
  userInfo: { name: string; email: string }
) => {
  const { format, startDate, endDate, selectedFields } = config;
  
  const filteredTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.createdAt).toISOString().split('T')[0];
    return transactionDate >= startDate && transactionDate <= endDate;
  });

  if (format === 'pdf') {
    return generatePDFStatement(filteredTransactions, config, userInfo);
  } else {
    return generateWordStatement(filteredTransactions, config, userInfo);
  }
};

const generatePDFStatement = (
  transactions: Transaction[],
  config: TransactionConfig,
  userInfo: { name: string; email: string }
) => {
  const { selectedFields, startDate, endDate } = config;
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #004B5B; padding-bottom: 20px;">
        <h1 style="color: #004B5B; margin: 0;">TRANSACTION STATEMENT</h1>
        <p style="margin: 5px 0; color: #666;">Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h3 style="color: #004B5B; margin-bottom: 10px;">Account Holder Information</h3>
        <p><strong>Name:</strong> ${userInfo.name}</p>
        <p><strong>Email:</strong> ${userInfo.email}</p>
        <p><strong>Statement Date:</strong> ${new Date().toLocaleDateString()}</p>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="color: #004B5B;">Transaction Summary</h3>
        <p><strong>Total Transactions:</strong> ${transactions.length}</p>
        <p><strong>Total Buy Orders:</strong> ${transactions.filter(t => t.type === 'BUY').length}</p>
        <p><strong>Total Sell Orders:</strong> ${transactions.filter(t => t.type === 'SELL').length}</p>
        <p><strong>Total Amount:</strong> Rwf ${transactions.reduce((sum, t) => sum + parseFloat(t.totalAmount), 0).toLocaleString()}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            ${selectedFields.map(field => `<th style="border: 1px solid #ddd; padding: 12px; text-align: left; font-weight: bold;">${getFieldLabel(field)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${transactions.map((transaction, index) => `
            <tr style="border-bottom: 1px solid #eee;">
              ${selectedFields.map(field => `<td style="border: 1px solid #ddd; padding: 12px;">${getFieldValue(transaction, field, index)}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

const generateWordStatement = (
  transactions: Transaction[],
  config: TransactionConfig,
  userInfo: { name: string; email: string }
) => {
  const { selectedFields, startDate, endDate } = config;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Transaction Statement</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #004B5B; padding-bottom: 20px; }
        .title { color: #004B5B; font-size: 24px; font-weight: bold; margin: 0; }
        .period { color: #666; margin: 5px 0; }
        .section { margin-bottom: 30px; }
        .section-title { color: #004B5B; font-size: 18px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #f8f9fa; border: 1px solid #ddd; padding: 12px; text-align: left; font-weight: bold; }
        td { border: 1px solid #ddd; padding: 12px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="title">TRANSACTION STATEMENT</h1>
        <p class="period">Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</p>
      </div>
      
      <div class="section">
        <h3 class="section-title">Account Holder Information</h3>
        <p><strong>Name:</strong> ${userInfo.name}</p>
        <p><strong>Email:</strong> ${userInfo.email}</p>
        <p><strong>Statement Date:</strong> ${new Date().toLocaleDateString()}</p>
      </div>

      <div class="section">
        <h3 class="section-title">Transaction Summary</h3>
        <p><strong>Total Transactions:</strong> ${transactions.length}</p>
        <p><strong>Total Buy Orders:</strong> ${transactions.filter(t => t.type === 'BUY').length}</p>
        <p><strong>Total Sell Orders:</strong> ${transactions.filter(t => t.type === 'SELL').length}</p>
        <p><strong>Total Amount:</strong> Rwf ${transactions.reduce((sum, t) => sum + parseFloat(t.totalAmount), 0).toLocaleString()}</p>
      </div>

      <table>
        <thead>
          <tr>
            ${selectedFields.map(field => `<th>${getFieldLabel(field)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${transactions.map((transaction, index) => `
            <tr>
              ${selectedFields.map(field => `<td>${getFieldValue(transaction, field, index)}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>

     
    </body>
    </html>
  `;
};

const getFieldLabel = (field: string): string => {
  const labels: Record<string, string> = {
    id: 'Transaction ID',
    type: 'Type',
    company: 'Company/Symbol',
    quantity: 'Quantity',
    executedPrice: 'Price (Rwf)',
    totalAmount: 'Total Amount (Rwf)',
    status: 'Status',
    createdAt: 'Date & Time',
  };
  return labels[field] || field;
};

const getFieldValue = (transaction: Transaction, field: string, index: number): string => {
  switch (field) {
    case 'id':
      return (index + 1).toString();
    case 'type':
      return transaction.type;
    case 'company':
      return `${transaction.company.symbol} - ${transaction.company.name}`;
    case 'quantity':
      return transaction.quantity.toString();
    case 'executedPrice':
      return parseFloat(transaction.executedPrice || '0').toFixed(2);
    case 'totalAmount':
      return parseFloat(transaction.totalAmount).toLocaleString();
    case 'status':
      return transaction.status;
    case 'createdAt':
      return new Date(transaction.createdAt).toLocaleString();
    default:
      return '';
  }
};
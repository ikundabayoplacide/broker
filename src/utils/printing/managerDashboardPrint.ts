interface DashboardData {
  totalClients: string;
  activeTellers: string;
  dailyVolume: string;
  monthlyVolume: string;
  pendingKYC: string;
  reportsGenerated: string;
  platformHealth: string;
  systemAlerts: string;
}

const dailyVolumeData = [
  { day: "Monday", volume: "1,850,000" },
  { day: "Tuesday", volume: "2,100,000" },
  { day: "Wednesday", volume: "1,950,000" },
  { day: "Thursday", volume: "2,200,000" },
  { day: "Friday", volume: "2,004,000" },
  { day: "Saturday", volume: "1,800,000" },
  { day: "Sunday", volume: "1,600,000" }
];

const monthlyVolumeData = [
  { month: "January", volume: "45,000,000" },
  { month: "February", volume: "52,000,000" },
  { month: "March", volume: "48,000,000" },
  { month: "April", volume: "61,000,000" },
  { month: "May", volume: "58,000,000" },
  { month: "June", volume: "67,000,000" }
];

export const generateManagerDashboardPrint = (data?: Partial<DashboardData>) => {
  const defaultData: DashboardData = {
    totalClients: "2,847",
    activeTellers: "8",
    dailyVolume: "2,004,000 Rwf",
    monthlyVolume: "156,000,000 Rwf",
    pendingKYC: "23",
    reportsGenerated: "42",
    platformHealth: "99.97%",
    systemAlerts: "4"
  };

  const printData = { ...defaultData, ...data };

  return `
    <html>
      <head>
        <title>Manager Dashboard Report</title>
        <style>
          @media print {
            @page { size: A4; margin: 1in; }
            body { font-family: Arial, sans-serif; font-size: 12px; }
            .header { text-align: center; margin-bottom: 20px; }
            .logo { width: 80px; height: auto; margin-bottom: 10px; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
            .card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
            .card-title { font-weight: bold; color: #374151; margin-bottom: 8px; }
            .card-value { font-size: 18px; font-weight: bold; color: #1f2937; }
            .card-change { font-size: 12px; color: #10b981; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; }
            th { background-color: #f3f4f6; text-align: left; }
            .chart-section { margin-top: 30px; }
            .chart-title { font-size: 16px; font-weight: bold; margin-bottom: 15px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${window.location.origin}/logo.svg" alt="Company Logo" class="logo" />
          <h1>Manager Dashboard Report</h1>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="grid">
          <div class="card">
            <div class="card-title">Total Clients</div>
            <div class="card-value">${printData.totalClients}</div>
            <div class="card-change">+12% this month</div>
          </div>
          <div class="card">
            <div class="card-title">Active Tellers</div>
            <div class="card-value">${printData.activeTellers}</div>
            <div class="card-change">All operational</div>
          </div>
          <div class="card">
            <div class="card-title">Daily Volume</div>
            <div class="card-value">${printData.dailyVolume}</div>
            <div class="card-change">+8.5% from yesterday</div>
          </div>
          <div class="card">
            <div class="card-title">Monthly Trading Volume</div>
            <div class="card-value">${printData.monthlyVolume}</div>
            <div class="card-change">+8.5% from yesterday</div>
          </div>
          <div class="card">
            <div class="card-title">Pending KYC</div>
            <div class="card-value">${printData.pendingKYC}</div>
            <div class="card-change">Requires review</div>
          </div>
          <div class="card">
            <div class="card-title">Reports Generated</div>
            <div class="card-value">${printData.reportsGenerated}</div>
            <div class="card-change">This month</div>
          </div>
          <div class="card">
            <div class="card-title">Platform Health</div>
            <div class="card-value">${printData.platformHealth}</div>
            <div class="card-change">Stable last 30 days</div>
          </div>
          <div class="card">
            <div class="card-title">System Alerts</div>
            <div class="card-value">${printData.systemAlerts}</div>
            <div class="card-change">Requires attention</div>
          </div>
        </div>
        
        <div class="chart-section">
          <h3 class="chart-title">Daily Trading Volume</h3>
          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th style="text-align: right;">Volume (RWF)</th>
              </tr>
            </thead>
            <tbody>
              ${dailyVolumeData.map(item => `
                <tr>
                  <td>${item.day}</td>
                  <td style="text-align: right;">${item.volume}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <h3 class="chart-title">Monthly Trading Volume</h3>
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th style="text-align: right;">Volume (RWF)</th>
              </tr>
            </thead>
            <tbody>
              ${monthlyVolumeData.map(item => `
                <tr>
                  <td>${item.month}</td>
                  <td style="text-align: right;">${item.volume}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </body>
    </html>
  `;
};
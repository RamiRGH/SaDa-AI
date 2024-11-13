//PIE CHART
const DATA_COUNT = 5;
const NUMBER_CFG = { count: DATA_COUNT, min: 0, max: 100 };

const data = {
  labels: ['Red', 'Orange', 'Yellow', 'Green', 'Blue'],
  datasets: [
    {
      label: 'Dataset 1',
      data: CFGNums(NUMBER_CFG),
      backgroundColor: Object.values(CHART_COLORS),
    },
  ],
};
const pieConfig = {
  type: 'pie',
  data: {
    labels: ['Company A', 'Company B', 'Company C'],
    datasets: [
      {
        label: 'Market Share',
        data: [25, 30, 20], // Market share percentages
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(255, 206, 86, 0.6)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 206, 86, 1)',
        ],
        borderWidth: 1,
      },
    ],
  },
  options: {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Market Share Comparison',
        font: {
          size: 18,
        },
      },
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.label || '';
            const value = context.raw || 0;
            return `${label}: ${value}%`;
          },
        },
      },
    },
  },
};
const pieChart = document.querySelectorAll('#pie-chart');
new Chart(pieChart, pieConfig);

//GROUPED BAR CHART
const groupedConfig = {
  type: 'bar',
  data: {
    labels: ['Company A', 'Company B', 'Company C'],
    datasets: [
      {
        label: 'Profit Margin Q1-2024',
        data: [20, 15, 25],
        backgroundColor: 'blue',
      },
      {
        label: 'Profit Margin Q1-2023',
        data: [18, 12, 22],
        backgroundColor: 'green',
      },
    ],
  },
  options: {
    indexAxis: 'y', // Horizontal bars
    scales: {
      x: { beginAtZero: true },
    },
  },
};
const groupedChart = document.querySelectorAll('#grouped-chart');
new Chart(groupedChart, groupedConfig);

//LINE CHART
const lineConfig = {
  type: 'line',
  data: {
    labels: ['Q1-2023', 'Q2-2023', 'Q3-2023', 'Q4-2023', 'Q1-2024'], // Adjust labels as needed
    datasets: [
      {
        label: 'Company A',
        data: [5, 10, 15, 20, 25], // Revenue growth values for each period
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        fill: true,
      },
      {
        label: 'Company B',
        data: [4, 8, 12, 16, 20],
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        fill: true,
      },
      // Add more datasets for additional companies
    ],
  },
  options: {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Revenue Growth Comparison',
        font: {
          size: 18,
        },
      },
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Revenue Growth (%)',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Time Period',
        },
      },
    },
  },
};

const lineChart = document.querySelector('#line-chart');
new Chart(lineChart, lineConfig);

//BAR CHART
const barConfig = {
  type: 'bar',
  data: {
    labels: ['Company A', 'Company B', 'Company C', 'Company D'], // Company names
    datasets: [
      {
        label: 'EPS for Q1-2024',
        data: [1.1, 0.9, 1.3, 1.2], // EPS values for each company
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 1,
      },
    ],
  },
  options: {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Earnings Per Share (EPS) Comparison for Q1-2024',
        font: {
          size: 18,
        },
      },
      legend: {
        display: false, // Hide legend if only one dataset
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'EPS Value',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Company',
        },
      },
    },
  },
};

const barChart = document.querySelector('#bar-chart');
new Chart(barChart, barConfig);

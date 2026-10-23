/* ========== REVEAL ON SCROLL ========== */
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) entry.target.classList.add('is-visible');
            });
        }, { threshold: 0.08 });

        document.querySelectorAll('.reveal-on-scroll').forEach(el => revealObserver.observe(el));

        /* ========== DOMENICA TOGGLE (pasti) ========== */
        let currentSundayOption = 'A';

        function setSundayOption(option) {
            currentSundayOption = option;
            const btnA = document.getElementById('btnOptA');
            const btnB = document.getElementById('btnOptB');
            const panelA = document.getElementById('panelOptA');
            const panelB = document.getElementById('panelOptB');

            if (option === 'A') {
                btnA.className = "toggle-btn flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold bg-claude-terracotta text-white shadow-sm active:scale-95";
                btnB.className = "toggle-btn flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold text-claude-muted hover:text-claude-text active:scale-95";
                panelA.classList.remove('hidden');
                panelB.classList.add('hidden');
            } else {
                btnB.className = "toggle-btn flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold bg-claude-terracotta text-white shadow-sm active:scale-95";
                btnA.className = "toggle-btn flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold text-claude-muted hover:text-claude-text active:scale-95";
                panelB.classList.remove('hidden');
                panelA.classList.add('hidden');
            }
        }

        /* ========== CHART VIEW TOGGLE (grafici) ========== */
        let chartView = 'A';

        function setChartView(view) {
            chartView = view;
            const btnA = document.getElementById('btnChartA');
            const btnB = document.getElementById('btnChartB');
            if (view === 'A') {
                btnA.className = "toggle-btn flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold bg-claude-terracotta text-white shadow-sm active:scale-95";
                btnB.className = "toggle-btn flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold text-claude-muted hover:text-claude-text active:scale-95";
            } else {
                btnB.className = "toggle-btn flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold bg-claude-terracotta text-white shadow-sm active:scale-95";
                btnA.className = "toggle-btn flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold text-claude-muted hover:text-claude-text active:scale-95";
            }
            updateCharts();
        }

        /* ========== CHARTS ========== */
        let caloricChart, macroChart;

        /* kcal: media giornaliera Lun-Ven, Sabato, Domenica
           macro: totali settimanali in grammi
           total/avg/deficit: riepilogo settimanale (TDEE 1850 × 7 = 12.950) */
        const CHART_DATA = {
            A: {
                kcal:  [944, 1030, 550],
                macro: [435, 405, 294],
                title: 'Settimana · Leggera'
            },
            B: {
                kcal:  [944, 1030, 2250],
                macro: [540, 535, 377],
                title: 'Settimana · AYCE'
            }
        };

        const WEEKLY_DATA = {
            A: { total: 6300, consumo: 12950, deficit: 6650, label: 'Domenica Leggera', breakdown: 'Lun–Ven 4.720 · Sab 1.030 · Dom 550' },
            B: { total: 8000, consumo: 12950, deficit: 4950, label: 'Domenica AYCE',    breakdown: 'Lun–Ven 4.720 · Sab 1.030 · Dom 2.250' }
        };

        const fmt = (n) => n.toLocaleString('it-IT');

        function updateWeeklySummary(view) {
            const d = WEEKLY_DATA[view];
            if (!d) return;
            const labelEl = document.getElementById('weeklyScopeLabel');
            const totalEl = document.getElementById('weeklyTotal');
            const consumoEl = document.getElementById('weeklyConsumo');
            const deficitEl = document.getElementById('weeklyDeficit');
            const breakEl = document.getElementById('weeklyBreakdown');
            if (labelEl)   labelEl.textContent = d.label;
            if (totalEl)   totalEl.textContent = fmt(d.total);
            if (consumoEl) consumoEl.textContent = fmt(d.consumo);
            if (deficitEl) deficitEl.textContent = fmt(d.deficit);
            if (breakEl)   breakEl.innerHTML = d.breakdown
                .replace(/(\d[\d.]*)/g, '<span class="text-claude-text font-semibold">$1</span>');
        }
        /* Plugin: scrive la percentuale dentro ogni fetta del doughnut */
        const doughnutLabels = {
            id: 'doughnutLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                const meta = chart.getDatasetMeta(0);
                if (!meta || !meta.data) return;
                const data = chart.data.datasets[0].data;
                const total = data.reduce((a, b) => a + b, 0);
                if (!total) return;
                ctx.save();
                ctx.font = 'bold 13px Inter, sans-serif';
                ctx.fillStyle = '#FFFFFF';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                meta.data.forEach((arc, i) => {
                    const pct = Math.round((data[i] / total) * 100);
                    if (pct < 5) return;
                    const pos = arc.tooltipPosition();
                    ctx.fillText(pct + '%', pos.x, pos.y);
                });
                ctx.restore();
            }
        };
        /* Plugin: linea tratteggiata orizzontale TDEE a 1850 kcal */
        const tdeeLine = {
            id: 'tdeeLine',
            afterDatasetsDraw(chart) {
                const { ctx, chartArea, scales } = chart;
                if (!scales.y || !chartArea) return;
                const y = scales.y.getPixelForValue(1850);
                if (y < chartArea.top || y > chartArea.bottom) return;
                ctx.save();
                ctx.beginPath();
                ctx.setLineDash([6, 6]);
                ctx.strokeStyle = '#3D3833';
                ctx.lineWidth = 2;
                ctx.moveTo(chartArea.left, y);
                ctx.lineTo(chartArea.right, y);
                ctx.stroke();
                ctx.restore();
            }
        };
        Chart.register(tdeeLine);

        function initCharts() {
            if (!window.Chart) return;
            const textColor = '#3D3833';
            const gridColor = 'rgba(61, 56, 51, 0.06)';

            /* ---------- Bar chart: kcal / giorno con TDEE ---------- */
                        const ctx1 = document.getElementById('caloricChart').getContext('2d');
            caloricChart = new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: ['Lun-Ven', 'Sabato', 'Domenica'],
                    datasets: [
                        {
                            label: 'Apporto (kcal/giorno)',
                            data: CHART_DATA.A.kcal,
                            backgroundColor: ['#DA7756', '#4A7C59', '#5B6E80'],
                            borderRadius: 8,
                            borderSkipped: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    plugins: {
                        legend: {
                            display: true,
                            labels: {
                                color: textColor,
                                font: { family: 'Inter', size: 10 },
                                generateLabels: (chart) => {
                                    const labels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                                    labels.push({
                                        text: 'TDEE Mantenimento (1.850)',
                                        fillStyle: 'transparent',
                                        strokeStyle: '#3D3833',
                                        lineWidth: 2,
                                        lineDash: [4, 4],
                                        hidden: false,
                                        datasetIndex: -1
                                    });
                                    return labels;
                                }
                            }
                        }
                    },
                    scales: {
                        x: { ticks: { color: textColor, font: { family: 'Inter', size: 10 } }, grid: { display: false } },
                        y: { beginAtZero: true, max: 2500, ticks: { color: textColor, font: { family: 'Inter', size: 10 }, stepSize: 250 }, grid: { color: gridColor } }
                    }
                }
            });

            /* ---------- Doughnut: macro settimanali ---------- */
            const ctx2 = document.getElementById('macroChart').getContext('2d');
            macroChart = new Chart(ctx2, {
                type: 'doughnut',
                data: {
                    labels: ['Proteine', 'Carboidrati', 'Grassi'],
                    datasets: [{
                        data: CHART_DATA.A.macro,
                        backgroundColor: ['#DA7756', '#4A7C59', '#5B6E80'],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: textColor,
                                font: { family: 'Inter', size: 10 },
                                boxWidth: 16,
                                boxHeight: 8,
                                padding: 8
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const pct = Math.round((context.parsed / total) * 100);
                                    return context.label + ': ' + context.parsed + 'g · ' + pct + '%';
                                }
                            }
                        }
                    },
                                        cutout: '65%'
                },
                plugins: [doughnutLabels]
            });

            /* Sync riepilogo settimanale con lo stato iniziale */
            updateWeeklySummary(chartView);
        }

        function updateCharts() {
            if (!caloricChart || !macroChart) return;
            const data = CHART_DATA[chartView];
            caloricChart.data.datasets[0].data = data.kcal;
            caloricChart.update();
            macroChart.data.datasets[0].data = data.macro;
            macroChart.update();
            const titleEl = document.getElementById('macroChartTitle');
            if (titleEl) titleEl.textContent = data.title;
            updateWeeklySummary(chartView);
        }

        window.addEventListener('DOMContentLoaded', initCharts);

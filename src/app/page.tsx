"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import styles from './page.module.css';
import { TRENDING_TOKENS as tokenData } from './data';
import type { NetworkShare } from './data';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const formatCompactCurrency = (value: number): string => {
  if (Math.abs(value) >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (Math.abs(value) < 10) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
};

const formatPriceTick = (value: number): string => {
  if (Math.abs(value) >= 1000) return formatCompactCurrency(value);
  if (Math.abs(value) >= 10) return `$${value.toFixed(2)}`;
  if (Math.abs(value) >= 1) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(4)}`;
};

const formatNumber = (value: number): string => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
};

const formatPercentChange = (value: number): string => `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;

const formatAge = (deployedDate: string): string => {
  const deployed = new Date(deployedDate);
  const now = new Date("2026-03-10T00:00:00Z");
  const diffMs = now.getTime() - deployed.getTime();
  const years = diffMs / (365.25 * 24 * 60 * 60 * 1000);
  return `~${years.toFixed(1)} yrs`;
};

const formatSupply = (circulating: number, total: number | null): string => {
  if (circulating === 0 && total === null) return 'Private';
  const circulatingText = formatNumber(circulating);
  const totalText = total === null ? "No cap" : formatNumber(total);
  return `${circulatingText} / ${totalText}`;
};

export default function Home() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<string, boolean>>({});
  const AUTOPLAY_DUR = 10000;

  useEffect(() => {
    const start = Date.now();
    let animationFrame: number;

    const updateProgress = () => {
      const now = Date.now();
      const elapsed = now - start;
      const p = Math.min((elapsed / AUTOPLAY_DUR) * 100, 100);

      if (p < 100) {
        animationFrame = requestAnimationFrame(updateProgress);
      } else {
        setActiveIndex((prev) => (prev + 1) % tokenData.length);
      }
    };

    animationFrame = requestAnimationFrame(updateProgress);

    return () => cancelAnimationFrame(animationFrame);
  }, [activeIndex]);

  const activeToken = tokenData[activeIndex];
  const showLogoImage = Boolean(activeToken.logoUrl) && !imageLoadErrors[activeToken.symbol];

  const priceDomain = useMemo((): [number, number] => {
    const values = activeToken.priceChartData.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const spread = max - min;
    const padding = spread > 0 ? spread * 0.2 : Math.max(min * 0.01, 0.001);
    return [Math.max(0, min - padding), max + padding];
  }, [activeToken.priceChartData]);

  const volumeChartData = activeToken.volumeChartData;

  const volumeDomain = useMemo((): [number, number] => {
    const values = volumeChartData.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const spread = max - min;
    const padding = spread > 0 ? spread * 0.2 : max * 0.1;
    return [Math.max(0, min - padding), max + padding];
  }, [volumeChartData]);

  const aumDomain = useMemo((): [number, number] => {
    if (!activeToken.aumChartData) return [0, 1];
    const values = activeToken.aumChartData.map((p) => p.value);
    const max = Math.max(...values);
    return [0, max * 1.1];
  }, [activeToken.aumChartData]);

  // Derive dynamic color styling variables
  const dynamicStyles = useMemo(() => {
    return {
      '--accent-color': activeToken.color,
      '--accent-glow': `${activeToken.color}20`, // 20 hex opacity
    } as React.CSSProperties;
  }, [activeToken]);

  const networkTotal = useMemo(() => {
    if (!activeToken.marketCapByNetwork) return 0;
    return activeToken.marketCapByNetwork.reduce((sum, n) => sum + n.value, 0);
  }, [activeToken.marketCapByNetwork]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderPieLabel = useCallback(
    (props: any) => {
      const cx = Number(props.cx ?? 0);
      const cy = Number(props.cy ?? 0);
      const midAngle = Number(props.midAngle ?? 0);
      const outerRadius = Number(props.outerRadius ?? 0);
      const index = Number(props.index ?? 0);
      const data = activeToken.marketCapByNetwork as NetworkShare[];
      const entry = data[index];
      if (!entry) return null;
      const total = data.reduce((s, n) => s + n.value, 0);
      const pct = entry.value / total;
      if (pct < 0.06) return null;

      const RADIAN = Math.PI / 180;
      const radius = outerRadius + 18;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);
      const anchor = x > cx ? 'start' : 'end';

      return (
        <text x={x} y={y} textAnchor={anchor} dominantBaseline="central" fill="#e4e4e7" fontSize={11}>
          <tspan fontWeight={600}>{entry.name}</tspan>
          <tspan dx={4} fill="#a1a1aa">{formatCompactCurrency(entry.value)}</tspan>
        </text>
      );
    },
    [activeToken.marketCapByNetwork],
  );

  const handleNavClick = (index: number) => {
    setActiveIndex(index);
  };

  return (
    <div className={styles.container} style={dynamicStyles}>

      {/* Header Info */}
      <header className={styles.header}>
        <div className={styles.carouselProgress}>
          <span>{activeIndex + 1}/{tokenData.length}</span>
          <div className={styles.dots}>
            {tokenData.map((_, i) => (
              <div
                key={i}
                className={`${styles.dot} ${i === activeIndex ? styles.active : ''}`}
                style={i === activeIndex ? { backgroundColor: activeToken.color, boxShadow: `0 0 8px ${activeToken.color}` } : {}}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className={styles.mainGrid}>

        {/* Left Column */}
        <div className={styles.leftCol}>
          {/* Top: Price Chart */}
          <div className={`${styles.panel} ${styles.chartLeft}`}>
            <div className={styles.panelTitle}>Price (30d)</div>
            <div className={styles.chartWrapper}>
              <div className={styles.chartAbsolute}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activeToken.priceChartData}>
                    <defs>
                      <linearGradient id={`priceGradient-${activeToken.symbol}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={activeToken.color} stopOpacity={0.32} />
                        <stop offset="100%" stopColor={activeToken.color} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.12)" />
                    <XAxis dataKey="time" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} minTickGap={22} />
                    <YAxis domain={priceDomain} stroke="#a1a1aa" width={62} fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatPriceTick} />
                    <Tooltip
                      labelStyle={{ color: '#f4f4f5', fontSize: '12px' }}
                      formatter={(value) => formatPriceTick(Number(value))}
                      contentStyle={{ backgroundColor: '#111114', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: activeToken.color }}
                      cursor={{ stroke: 'rgba(255,255,255,0.32)', strokeWidth: 1 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={activeToken.color}
                      strokeWidth={2.5}
                      fill={`url(#priceGradient-${activeToken.symbol})`}
                      dot={false}
                      activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2, fill: activeToken.color }}
                      isAnimationActive
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Bottom Left: Did You Know */}
          <div className={`${styles.panel} ${styles.bottomInfoLeft}`} style={{
            borderLeft: `3px solid ${activeToken.color}`
          }}>
            <div className={styles.panelTitle} style={{ color: activeToken.color, fontWeight: 'bold' }}>Did You Know</div>
            <ul className={styles.infoList}>
              {activeToken.didYouKnow.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Center Column */}
        <div className={styles.centerCol}>
          <div className={styles.centerContent} key={activeToken.symbol}>
            <div className={styles.liveBadge}>
              {activeToken.category}
              {activeToken.marketCapRank > 0 && ` • Rank #${activeToken.marketCapRank}`}
            </div>
            <div
              className={styles.logoBox}
              style={{ borderColor: `${activeToken.color}40` }}
            >
              {showLogoImage ? (
                <img
                  src={`/token-visualizer-carousel${activeToken.logoUrl}`}
                  alt={activeToken.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                  onError={() =>
                    setImageLoadErrors((prev) => ({ ...prev, [activeToken.symbol]: true }))
                  }
                />
              ) : (
                <span style={{ color: activeToken.color, fontSize: '1.1rem', letterSpacing: '0.08em' }}>
                  {activeToken.symbol}
                </span>
              )}
            </div>
            <div className={styles.tokenSymbol}>${activeToken.symbol}</div>
            <h1 className={styles.tokenName}>{activeToken.name}</h1>
            <p className={styles.tokenDesc}>{activeToken.description}</p>

            {activeToken.fundMetrics ? (
              activeToken.category === 'Deposit Token' ? (
              <div className={styles.fundStats}>
                {/* Hero Tier */}
                <div className={styles.heroRow}>
                  <div className={styles.heroCard}>
                    <div className={styles.statLabel}>Price</div>
                    <div className={styles.heroValue}>{formatPriceTick(activeToken.fundMetrics.nav)}</div>
                    <div className={styles.heroSub}>Bank-backed deposit token</div>
                  </div>
                  <div className={`${styles.heroCard} ${styles.heroAccent}`}>
                    <div className={styles.statLabel}>Settlement</div>
                    <div className={styles.heroValue} style={{ color: 'var(--green)' }}>{activeToken.fundMetrics.settlement}</div>
                    <div className={styles.heroSub}>Instant finality</div>
                  </div>
                </div>

                {/* Mid Tier */}
                <div className={styles.midRow}>
                  <div className={styles.midCard}>
                    <div className={styles.statLabel}>Pilot Clients</div>
                    <div className={styles.midValue} style={{ fontSize: '0.95rem' }}>{activeToken.fundMetrics.pilotClients}</div>
                  </div>
                  <div className={styles.midCard}>
                    <div className={styles.statLabel}>Daily Volume</div>
                    <div className={styles.midValue}>{activeToken.fundMetrics.dailyVolume}</div>
                  </div>
                </div>

                {/* Fine Print Tier */}
                <div className={`${styles.fineRow} ${styles.fineRowWide}`}>
                  <div className={styles.fineCard}>
                    <div className={styles.statLabel}>Network</div>
                    <div className={styles.fineValue}>{activeToken.fundMetrics.network}</div>
                  </div>
                  <div className={`${styles.fineCard} ${styles.fineAccent}`}>
                    <div className={styles.statLabel}>Access</div>
                    <div className={styles.fineValue}>{activeToken.fundMetrics.access}</div>
                  </div>
                  <div className={styles.fineCard}>
                    <div className={styles.statLabel}>Custodian</div>
                    <div className={styles.fineValue}>{activeToken.fundMetrics.custodian}</div>
                  </div>
                  <div className={`${styles.fineCard} ${styles.fineAccent}`}>
                    <div className={styles.statLabel}>Launched</div>
                    <div className={styles.fineValue}>{activeToken.fundMetrics.inceptionDate}</div>
                  </div>
                </div>
              </div>
              ) : (
              <div className={styles.fundStats}>
                {/* Hero Tier */}
                <div className={styles.heroRow}>
                  <div className={styles.heroCard}>
                    <div className={styles.statLabel}>NAV</div>
                    <div className={styles.heroValue}>{formatPriceTick(activeToken.fundMetrics.nav)}</div>
                    <div className={styles.heroSub}>Stable value instrument</div>
                  </div>
                  <div className={`${styles.heroCard} ${styles.heroAccent}`}>
                    <div className={styles.statLabel}>7D APY</div>
                    <div className={styles.heroValue} style={{ color: 'var(--green)' }}>{activeToken.fundMetrics.apy7d}</div>
                    <div className={styles.heroDelta + ' ' + styles.red}>{activeToken.fundMetrics.apyDelta} from 7d ago</div>
                  </div>
                </div>

                {/* Mid Tier */}
                <div className={styles.midRow}>
                  <div className={styles.midCard}>
                    <div className={styles.statLabel}>Total AUM</div>
                    <div className={styles.midValue}>{formatCompactCurrency(activeToken.fundMetrics.totalValue)}</div>
                    <div className={`${styles.heroDelta} ${styles.green}`}>{activeToken.fundMetrics.totalValueDelta}</div>
                  </div>
                  <div className={styles.midCard}>
                    <div className={styles.statLabel}>Holders</div>
                    <div className={styles.midValue}>{formatNumber(activeToken.holdersCount)}</div>
                    <div className={`${styles.heroDelta} ${activeToken.fundMetrics.holdersDelta.startsWith('+') || activeToken.fundMetrics.holdersDelta.startsWith('▲') ? styles.green : styles.red}`}>{activeToken.fundMetrics.holdersDelta}</div>
                  </div>
                </div>

                {/* Fine Print Tier */}
                <div className={`${styles.fineRow} ${activeToken.fundMetrics.custodian ? styles.fineRowWide : ''}`}>
                  <div className={styles.fineCard}>
                    <div className={styles.statLabel}>Platform</div>
                    <div className={styles.fineValue}>{activeToken.fundMetrics.platform}</div>
                  </div>
                  <div className={`${styles.fineCard} ${styles.fineAccent}`}>
                    <div className={styles.statLabel}>Asset Class</div>
                    <div className={styles.fineValue}>{activeToken.fundMetrics.assetClass}</div>
                  </div>
                  <div className={styles.fineCard}>
                    <div className={styles.statLabel}>Mgmt Fee</div>
                    <div className={styles.fineValue}>{activeToken.fundMetrics.managementFee}</div>
                  </div>
                  {activeToken.fundMetrics.minInvestment ? (
                    <div className={`${styles.fineCard} ${styles.fineAccent}`}>
                      <div className={styles.statLabel}>Min. Investment</div>
                      <div className={styles.fineValue}>{activeToken.fundMetrics.minInvestment}</div>
                    </div>
                  ) : (
                    <div className={styles.fineCard}>
                      <div className={styles.statLabel}>Chains</div>
                      <div className={styles.fineValue}>{activeToken.fundMetrics.chains} networks</div>
                    </div>
                  )}
                  {activeToken.fundMetrics.custodian && (
                    <div className={styles.fineCard}>
                      <div className={styles.statLabel}>Custodian</div>
                      <div className={styles.fineValue}>{activeToken.fundMetrics.custodian}</div>
                    </div>
                  )}
                  {activeToken.fundMetrics.inceptionDate && (
                    <div className={styles.fineCard}>
                      <div className={styles.statLabel}>Inception</div>
                      <div className={styles.fineValue}>{activeToken.fundMetrics.inceptionDate}</div>
                    </div>
                  )}
                </div>
              </div>
              )
            ) : (
              <div className={styles.fundStats}>
                <div className={styles.heroRow}>
                  <div className={styles.heroCard}>
                    <div className={styles.statLabel}>Price</div>
                    <div className={styles.heroValue}>{formatPriceTick(activeToken.price)}</div>
                  </div>
                  <div className={`${styles.heroCard} ${styles.heroAccent}`}>
                    <div className={styles.statLabel}>24h Change</div>
                    <div className={styles.heroValue} style={{ color: activeToken.priceChange24h >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {formatPercentChange(activeToken.priceChange24h)}
                    </div>
                  </div>
                </div>

                <div className={styles.midRow}>
                  <div className={styles.midCard}>
                    <div className={styles.statLabel}>Market Cap</div>
                    <div className={styles.midValue}>{activeToken.marketCap > 0 ? formatCompactCurrency(activeToken.marketCap) : 'Private'}</div>
                  </div>
                  <div className={styles.midCard}>
                    <div className={styles.statLabel}>24h Volume</div>
                    <div className={styles.midValue}>{activeToken.totalVolume24h > 0 ? formatCompactCurrency(activeToken.totalVolume24h) : 'Private'}</div>
                  </div>
                </div>

                <div className={`${styles.fineRow} ${styles.fineRowWide}`}>
                  <div className={styles.fineCard}>
                    <div className={styles.statLabel}>Holders</div>
                    <div className={styles.fineValue}>{formatNumber(activeToken.holdersCount)}</div>
                  </div>
                  <div className={`${styles.fineCard} ${styles.fineAccent}`}>
                    <div className={styles.statLabel}>Launched</div>
                    <div className={styles.fineValue}>{formatAge(activeToken.deployedDate)}</div>
                  </div>
                  <div className={styles.fineCard}>
                    <div className={styles.statLabel}>Supply</div>
                    <div className={styles.fineValue} style={{ fontSize: '0.75rem' }}>
                      {formatSupply(activeToken.circulatingSupply, activeToken.totalSupply)}
                    </div>
                  </div>
                  {activeToken.category !== 'Stablecoin' && (
                  <div className={`${styles.fineCard} ${styles.fineAccent}`}>
                    <div className={styles.statLabel}>All-Time High</div>
                    <div className={styles.fineValue}>{formatPriceTick(activeToken.allTimeHigh.price)}</div>
                  </div>
                  )}
                  {!activeToken.consensusMechanism.startsWith('N/A') && (
                  <div className={styles.fineCard}>
                    <div className={styles.statLabel}>Consensus</div>
                    <div className={styles.fineValue} style={{ fontSize: '0.75rem' }}>{activeToken.consensusMechanism}</div>
                  </div>
                  )}
                  {activeToken.category !== 'Stablecoin' && (
                  <div className={`${styles.fineCard} ${styles.fineAccent}`}>
                    <div className={styles.statLabel}>ATH Date</div>
                    <div className={styles.fineValue}>{activeToken.allTimeHigh.date}</div>
                  </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className={styles.rightCol}>
          {activeToken.aumChartData ? (
            <div className={`${styles.panel} ${styles.chartRight}`}>
              <div className={styles.panelTitle}>AUM Growth (Since Inception)</div>
              <div className={styles.chartWrapper}>
                <div className={styles.chartAbsolute}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activeToken.aumChartData}>
                      <defs>
                        <linearGradient id={`aumGradient-${activeToken.symbol}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={activeToken.color} stopOpacity={0.32} />
                          <stop offset="100%" stopColor={activeToken.color} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.12)" />
                      <XAxis dataKey="time" stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} minTickGap={30} />
                      <YAxis domain={aumDomain} stroke="#a1a1aa" width={68} fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatCompactCurrency} />
                      <Tooltip
                        labelStyle={{ color: '#f4f4f5', fontSize: '12px' }}
                        formatter={(value) => [formatCompactCurrency(Number(value)), 'AUM']}
                        contentStyle={{ backgroundColor: '#111114', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        itemStyle={{ color: activeToken.color }}
                        cursor={{ stroke: 'rgba(255,255,255,0.32)', strokeWidth: 1 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={activeToken.color}
                        strokeWidth={2.5}
                        fill={`url(#aumGradient-${activeToken.symbol})`}
                        dot={false}
                        activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2, fill: activeToken.color }}
                        isAnimationActive
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : activeToken.marketCapByNetwork ? (
            <div className={`${styles.panel} ${styles.chartRight} ${styles.piePanel}`}>
              <div className={styles.panelTitle}>Market Cap by Network</div>
              <div className={styles.pieLayout}>
                <div className={styles.pieChartBox}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={activeToken.marketCapByNetwork}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius="60%"
                        innerRadius="28%"
                        strokeWidth={1}
                        stroke="rgba(0,0,0,0.4)"
                        paddingAngle={1}
                        label={renderPieLabel}
                        labelLine={false}
                        isAnimationActive
                      >
                        {activeToken.marketCapByNetwork.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central" fill="#f4f4f5" fontSize={16} fontWeight={700}>
                        {formatCompactCurrency(networkTotal)}
                      </text>
                      <text x="50%" y="55%" textAnchor="middle" dominantBaseline="central" fill="#71717a" fontSize={10}>
                        Total AUM
                      </text>
                      <Tooltip
                        formatter={(value) => [formatCompactCurrency(Number(value)), 'Market Cap']}
                        contentStyle={{ backgroundColor: '#111114', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                        itemStyle={{ color: '#f4f4f5' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className={styles.pieLegend}>
                  {activeToken.marketCapByNetwork.map((entry, i) => {
                    const pct = ((entry.value / networkTotal) * 100).toFixed(1);
                    return (
                      <div key={i} className={styles.legendRow}>
                        <span className={styles.legendDot} style={{ backgroundColor: entry.color }} />
                        <span className={styles.legendName}>{entry.name}</span>
                        <span className={styles.legendPct}>{pct}%</span>
                        <span className={styles.legendValue}>{formatCompactCurrency(entry.value)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : activeToken.howItWorks ? (
            (() => {
              const hw = activeToken.howItWorks;
              const lanes = hw.entities;
              const n = lanes.length;
              const laneIndex = Object.fromEntries(lanes.map((e, i) => [e.id, i]));
              const colCenter = (col: number) => ((2 * col + 1) / (2 * n)) * 100;
              const circled = ['\u2460', '\u2461', '\u2462', '\u2463'];
              return (
                <div className={`${styles.panel} ${styles.chartRight} ${styles.howItWorksPanel}`}>
                  <div className={styles.panelTitle}>How It Works</div>
                  <div className={styles.howItWorksContent}>
                    {/* Column headers */}
                    <div className={styles.swimRow}>
                      <div className={styles.swimLanes}>
                        {lanes.map((e) => (
                          <div key={e.id} className={styles.swimHeader} style={{ borderColor: e.color }}>
                            <span className={styles.swimHeaderLabel} style={{ color: e.color }}>{e.label}</span>
                            {e.sublabel && <span className={styles.swimHeaderSub}>{e.sublabel}</span>}
                          </div>
                        ))}
                      </div>
                      <div className={styles.swimLabelSpacer} />
                    </div>

                    {/* Arrow rows */}
                    <div className={styles.swimBody}>
                      {hw.steps.map((step) => {
                        const fromCol = laneIndex[step.from];
                        const toCol = laneIndex[step.to];
                        const goesLeft = toCol < fromCol;
                        const leftPct = colCenter(Math.min(fromCol, toCol));
                        const widthPct = colCenter(Math.max(fromCol, toCol)) - leftPct;
                        return (
                          <div key={step.number} className={styles.swimRow}>
                            <div className={styles.swimLanes}>
                              {lanes.map((lane, colIdx) => (
                                <div key={colIdx} className={styles.swimCell}>
                                  <div className={styles.swimLaneLine} style={{ backgroundColor: lane.color }} />
                                </div>
                              ))}
                              {/* Single arrow element */}
                              <div
                                className={styles.swimArrow}
                                style={{ left: `${leftPct}%`, width: `${widthPct}%`, backgroundColor: step.color }}
                              >
                                <div
                                  className={styles.swimDot}
                                  style={{ backgroundColor: step.color, [goesLeft ? 'right' : 'left']: 0 }}
                                />
                                <div
                                  className={`${styles.swimArrowHead} ${goesLeft ? styles.swimArrowLeft : styles.swimArrowRight}`}
                                  style={goesLeft
                                    ? { borderRightColor: step.color, left: 0 }
                                    : { borderLeftColor: step.color, right: 0 }
                                  }
                                />
                              </div>
                            </div>
                            <div className={styles.swimLabel} style={{ color: step.color }}>
                              <span className={styles.swimNum}>{circled[step.number - 1]}</span>
                              {step.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className={styles.flowTagline}>{hw.tagline}</div>
                    <div className={styles.flowProperties}>
                      {hw.properties.map((prop, i) => (
                        <span key={i} className={styles.flowProp}>{prop}</span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className={`${styles.panel} ${styles.chartRight}`}>
              <div className={styles.panelTitle}>Transactions (30d)</div>
              <div className={styles.chartWrapper}>
                <div className={styles.chartAbsolute}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={volumeChartData}>
                      <defs>
                        <linearGradient id={`volumeGradient-${activeToken.symbol}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={activeToken.color} stopOpacity={0.32} />
                          <stop offset="100%" stopColor={activeToken.color} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.12)" />
                      <XAxis dataKey="time" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} minTickGap={22} />
                      <YAxis domain={volumeDomain} stroke="#a1a1aa" width={62} fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
                      <Tooltip
                        labelStyle={{ color: '#f4f4f5', fontSize: '12px' }}
                        formatter={(value) => formatNumber(Number(value))}
                        contentStyle={{ backgroundColor: '#111114', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        itemStyle={{ color: activeToken.color }}
                        cursor={{ stroke: 'rgba(255,255,255,0.32)', strokeWidth: 1 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={activeToken.color}
                        strokeWidth={2.5}
                        fill={`url(#volumeGradient-${activeToken.symbol})`}
                        dot={false}
                        activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2, fill: activeToken.color }}
                        isAnimationActive
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Right: Real-World Use */}
          <div className={`${styles.panel} ${styles.bottomInfoRight}`} style={{
            borderLeft: `3px solid ${activeToken.color}`
          }}>
            <div className={styles.panelTitle} style={{ color: activeToken.color, fontWeight: 'bold' }}>Real-World Use</div>
            <ul className={`${styles.infoList}`}>
              {activeToken.realWorldUseCases.map((item, idx) => (
                <li key={idx} style={{ '--accent-color': activeToken.color } as React.CSSProperties}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

      </main>

      {/* Footer Navigation */}
      <footer className={styles.bottomNav}>
        {tokenData.map((t, idx) => (
          <button
            key={t.symbol}
            className={`${styles.navItem} ${idx === activeIndex ? styles.active : ''}`}
            onClick={() => handleNavClick(idx)}
            style={idx === activeIndex ? { color: t.color, backgroundColor: `${t.color}20` } : {}}
          >
            {t.symbol}
          </button>
        ))}
      </footer>

    </div>
  );
}

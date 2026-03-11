"use client";

import { useState, useEffect, useMemo } from 'react';
import styles from './page.module.css';
import { TRENDING_TOKENS as tokenData } from './data';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

  // Derive dynamic color styling variables
  const dynamicStyles = useMemo(() => {
    return {
      '--accent-color': activeToken.color,
      '--accent-glow': `${activeToken.color}20`, // 20 hex opacity
    } as React.CSSProperties;
  }, [activeToken]);

  const handleNavClick = (index: number) => {
    setActiveIndex(index);
  };

  return (
    <div className={styles.container} style={dynamicStyles}>

      {/* Header Info */}
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          RWA Dashboard
        </div>
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
            <div className={styles.logoBox} style={{ borderColor: `${activeToken.color}40`, overflow: 'hidden', padding: '16px', backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
              {showLogoImage ? (
                <img
                  src={activeToken.logoUrl}
                  alt={activeToken.name}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
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

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Price</div>
                <div className={styles.statValue}>{formatPriceTick(activeToken.price)}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>24h Change</div>
                <div className={`${styles.statValue} ${activeToken.priceChange24h >= 0 ? styles.green : styles.red}`}>
                  {formatPercentChange(activeToken.priceChange24h)}
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Market Cap</div>
                <div className={styles.statValue}>{activeToken.marketCap > 0 ? formatCompactCurrency(activeToken.marketCap) : 'Private'}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>24h Volume</div>
                <div className={styles.statValue}>{activeToken.totalVolume24h > 0 ? formatCompactCurrency(activeToken.totalVolume24h) : 'Private'}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Holders</div>
                <div className={styles.statValue}>{formatNumber(activeToken.holdersCount)}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Launched</div>
                <div className={styles.statValue}>{formatAge(activeToken.deployedDate)}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>All-Time High</div>
                <div className={styles.statValue}>{formatPriceTick(activeToken.allTimeHigh.price)}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Consensus</div>
                <div className={styles.statValue} style={{ fontSize: '0.82rem' }}>{activeToken.consensusMechanism}</div>
              </div>
              <div className={`${styles.statCard}`} style={{ gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ width: '100%' }}>
                    <div className={styles.statLabel}>Supply</div>
                    <div className={styles.statValue} style={{ fontSize: '0.9rem' }}>
                      {formatSupply(activeToken.circulatingSupply, activeToken.totalSupply)}
                    </div>
                  </div>
                </div>
              </div>
              <div className={`${styles.statCard}`} style={{ gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ width: '100%' }}>
                    <div className={styles.statLabel}>Primary Use Case</div>
                    <div className={styles.statValue} style={{ fontSize: '0.86rem', lineHeight: 1.35 }}>
                      {activeToken.primaryUseCase}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className={styles.rightCol}>
          {/* Top: Volume Chart */}
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

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';

/* ---------- types ---------- */
interface Standing {
  position: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

interface RecentFixture {
  date: string;
  home: string;
  away: string;
  score: string;
  result: 'W' | 'D' | 'L';
}

interface UpcomingFixture {
  date: string;
  home: string;
  away: string;
  time: string;
}

interface ClubData {
  name: string;
  league: string;
  color: string;
  standings: Standing[];
  fixtures: {
    recent: RecentFixture[];
    upcoming: UpcomingFixture[];
  };
}

interface ClubsResponse {
  linfield: ClubData;
  chelsea: ClubData;
}

/* ---------- helpers ---------- */
function resultColor(result: 'W' | 'D' | 'L'): string {
  if (result === 'W') return '#22c55e';
  if (result === 'D') return '#f59e0b';
  return '#ef4444';
}

function resultLabel(result: 'W' | 'D' | 'L'): string {
  if (result === 'W') return 'WIN';
  if (result === 'D') return 'DRAW';
  return 'LOSS';
}

function formatFixtureDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

/* ---------- main ---------- */
export default function ClubsPage() {
  const [data, setData] = useState<ClubsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'linfield' | 'chelsea'>('linfield');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/clubs');
      if (!res.ok) throw new Error('Failed to fetch club data');
      const json: ClubsResponse = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-2xl font-bold">My Clubs &#9917;</h1>
        <Card className="!border-red-500/30">
          <p className="text-red-400 text-sm">{error || 'No data available'}</p>
        </Card>
      </div>
    );
  }

  const club = data[activeTab];
  const linfieldColor = data.linfield.color || '#0033A0';
  const chelseaColor = data.chelsea.color || '#034694';

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <h1 className="text-2xl font-bold">My Clubs &#9917;</h1>

      {/* Club Tabs */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setActiveTab('linfield')}
          className="relative py-3 px-4 rounded-xl font-bold text-sm transition-all text-center"
          style={{
            backgroundColor: activeTab === 'linfield' ? linfieldColor : 'var(--bg-input)',
            color: activeTab === 'linfield' ? '#fff' : 'var(--text-secondary)',
            border: `2px solid ${activeTab === 'linfield' ? linfieldColor : 'transparent'}`,
          }}
        >
          <span className="text-lg block mb-0.5">&#9917;</span>
          Linfield
        </button>
        <button
          onClick={() => setActiveTab('chelsea')}
          className="relative py-3 px-4 rounded-xl font-bold text-sm transition-all text-center"
          style={{
            backgroundColor: activeTab === 'chelsea' ? chelseaColor : 'var(--bg-input)',
            color: activeTab === 'chelsea' ? '#fff' : 'var(--text-secondary)',
            border: `2px solid ${activeTab === 'chelsea' ? chelseaColor : 'transparent'}`,
          }}
        >
          <span className="text-lg block mb-0.5">&#128153;</span>
          Chelsea
        </button>
      </div>

      {/* Club Info */}
      <div className="flex items-center gap-3">
        <div
          className="w-1 h-10 rounded-full"
          style={{ backgroundColor: club.color }}
        />
        <div>
          <h2 className="text-lg font-bold">{club.name}</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{club.league}</p>
        </div>
      </div>

      {/* League Table */}
      <Card>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
          League Table
        </h3>
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-xs min-w-[420px]">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                <th className="text-left py-2 pr-2 font-medium w-8">#</th>
                <th className="text-left py-2 pr-2 font-medium">Team</th>
                <th className="text-center py-2 px-1 font-medium">P</th>
                <th className="text-center py-2 px-1 font-medium">W</th>
                <th className="text-center py-2 px-1 font-medium">D</th>
                <th className="text-center py-2 px-1 font-medium">L</th>
                <th className="text-center py-2 px-1 font-medium">GD</th>
                <th className="text-center py-2 pl-1 font-semibold">Pts</th>
              </tr>
            </thead>
            <tbody>
              {club.standings.map((row) => {
                const isUserTeam = row.team.toLowerCase() === club.name.toLowerCase();
                return (
                  <tr
                    key={row.position}
                    className="transition-colors"
                    style={{
                      backgroundColor: isUserTeam ? `${club.color}22` : 'transparent',
                      borderLeft: isUserTeam ? `3px solid ${club.color}` : '3px solid transparent',
                    }}
                  >
                    <td className="py-1.5 pr-2 font-medium" style={{ color: isUserTeam ? club.color : 'var(--text-muted)' }}>
                      {row.position}
                    </td>
                    <td className="py-1.5 pr-2 font-semibold truncate max-w-[140px]" style={{ color: isUserTeam ? club.color : 'var(--text-primary)' }}>
                      {row.team}
                    </td>
                    <td className="text-center py-1.5 px-1" style={{ color: 'var(--text-secondary)' }}>{row.played}</td>
                    <td className="text-center py-1.5 px-1" style={{ color: 'var(--text-secondary)' }}>{row.won}</td>
                    <td className="text-center py-1.5 px-1" style={{ color: 'var(--text-secondary)' }}>{row.drawn}</td>
                    <td className="text-center py-1.5 px-1" style={{ color: 'var(--text-secondary)' }}>{row.lost}</td>
                    <td
                      className="text-center py-1.5 px-1 font-medium"
                      style={{ color: row.gd > 0 ? '#22c55e' : row.gd < 0 ? '#ef4444' : 'var(--text-secondary)' }}
                    >
                      {row.gd > 0 ? `+${row.gd}` : row.gd}
                    </td>
                    <td className="text-center py-1.5 pl-1 font-bold" style={{ color: isUserTeam ? club.color : 'var(--text-primary)' }}>
                      {row.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent Results */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Recent Results
        </h3>
        {club.fixtures.recent.length === 0 ? (
          <Card>
            <p className="text-center py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
              No recent results available.
            </p>
          </Card>
        ) : (
          club.fixtures.recent.slice(0, 3).map((match, i) => (
            <Card key={i}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
                    {formatFixtureDate(match.date)}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{match.home}</p>
                      <p className="text-sm font-semibold truncate">{match.away}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        {match.score}
                      </p>
                    </div>
                  </div>
                </div>
                <span
                  className="text-[10px] font-black uppercase px-2 py-1 rounded-md flex-shrink-0"
                  style={{
                    backgroundColor: `${resultColor(match.result)}22`,
                    color: resultColor(match.result),
                  }}
                >
                  {resultLabel(match.result)}
                </span>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Upcoming Fixtures */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Upcoming Fixtures
        </h3>
        {club.fixtures.upcoming.length === 0 ? (
          <Card>
            <p className="text-center py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
              No upcoming fixtures available.
            </p>
          </Card>
        ) : (
          club.fixtures.upcoming.slice(0, 3).map((match, i) => (
            <Card key={i}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
                    {formatFixtureDate(match.date)}
                  </p>
                  <p className="text-sm font-semibold truncate">{match.home}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>vs {match.away}</p>
                </div>
                <div
                  className="flex flex-col items-center px-3 py-2 rounded-xl flex-shrink-0"
                  style={{ backgroundColor: `${club.color}18` }}
                >
                  <span className="text-xs font-bold" style={{ color: club.color }}>
                    {match.time}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>KO</span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

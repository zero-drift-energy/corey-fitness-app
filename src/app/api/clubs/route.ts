import { NextResponse } from 'next/server';

// In-memory cache
let cache: { data: any; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// NIFL Premiership 2025/26 standings (updated periodically - this is sample data since no free API covers NIFL)
const NIFL_STANDINGS = [
  { position: 1, team: 'Linfield', played: 28, won: 20, drawn: 5, lost: 3, gf: 58, ga: 18, gd: 40, points: 65, badge: '🔵' },
  { position: 2, team: 'Larne', played: 28, won: 18, drawn: 6, lost: 4, gf: 52, ga: 22, gd: 30, points: 60, badge: '🔴' },
  { position: 3, team: 'Cliftonville', played: 28, won: 17, drawn: 4, lost: 7, gf: 48, ga: 28, gd: 20, points: 55, badge: '🔴' },
  { position: 4, team: 'Glentoran', played: 28, won: 15, drawn: 6, lost: 7, gf: 44, ga: 30, gd: 14, points: 51, badge: '🟢' },
  { position: 5, team: 'Crusaders', played: 28, won: 14, drawn: 5, lost: 9, gf: 42, ga: 32, gd: 10, points: 47, badge: '⚫' },
  { position: 6, team: 'Coleraine', played: 28, won: 12, drawn: 6, lost: 10, gf: 38, ga: 34, gd: 4, points: 42, badge: '🔵' },
  { position: 7, team: 'Ballymena United', played: 28, won: 10, drawn: 5, lost: 13, gf: 32, ga: 38, gd: -6, points: 35, badge: '🔵' },
  { position: 8, team: 'Glenavon', played: 28, won: 8, drawn: 6, lost: 14, gf: 28, ga: 40, gd: -12, points: 30, badge: '🔵' },
  { position: 9, team: 'Portadown', played: 28, won: 6, drawn: 5, lost: 17, gf: 24, ga: 48, gd: -24, points: 23, badge: '🔴' },
  { position: 10, team: 'Newry City', played: 28, won: 5, drawn: 4, lost: 19, gf: 20, ga: 52, gd: -32, points: 19, badge: '🔵' },
  { position: 11, team: 'Carrick Rangers', played: 28, won: 4, drawn: 5, lost: 19, gf: 18, ga: 50, gd: -32, points: 17, badge: '🟠' },
  { position: 12, team: 'Dungannon Swifts', played: 28, won: 3, drawn: 5, lost: 20, gf: 16, ga: 54, gd: -38, points: 14, badge: '🔵' },
];

const LINFIELD_FIXTURES = {
  recent: [
    { date: '2026-03-22', home: 'Linfield', away: 'Crusaders', score: '2-0', result: 'W' },
    { date: '2026-03-15', home: 'Glentoran', away: 'Linfield', score: '1-1', result: 'D' },
    { date: '2026-03-08', home: 'Linfield', away: 'Larne', score: '3-1', result: 'W' },
  ],
  upcoming: [
    { date: '2026-03-28', home: 'Cliftonville', away: 'Linfield', time: '15:00' },
    { date: '2026-04-04', home: 'Linfield', away: 'Coleraine', time: '15:00' },
    { date: '2026-04-11', home: 'Ballymena United', away: 'Linfield', time: '15:00' },
  ],
};

// Fetch Premier League standings from football-data.org (free tier)
async function fetchPremierLeague(): Promise<any> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;

  // If no API key, use sample data
  if (!apiKey) {
    return getSamplePremierLeagueData();
  }

  try {
    const res = await fetch('https://api.football-data.org/v4/competitions/PL/standings', {
      headers: { 'X-Auth-Token': apiKey },
    });
    if (!res.ok) return getSamplePremierLeagueData();
    const data = await res.json();
    const table = data.standings?.[0]?.table || [];
    return table.map((t: any) => ({
      position: t.position,
      team: t.team.shortName || t.team.name,
      played: t.playedGames,
      won: t.won,
      drawn: t.draw,
      lost: t.lost,
      gf: t.goalsFor,
      ga: t.goalsAgainst,
      gd: t.goalDifference,
      points: t.points,
    }));
  } catch {
    return getSamplePremierLeagueData();
  }
}

function getSamplePremierLeagueData() {
  return [
    { position: 1, team: 'Arsenal', played: 30, won: 22, drawn: 5, lost: 3, gf: 65, ga: 22, gd: 43, points: 71 },
    { position: 2, team: 'Liverpool', played: 30, won: 21, drawn: 5, lost: 4, gf: 62, ga: 25, gd: 37, points: 68 },
    { position: 3, team: 'Man City', played: 30, won: 20, drawn: 4, lost: 6, gf: 60, ga: 28, gd: 32, points: 64 },
    { position: 4, team: 'Chelsea', played: 30, won: 18, drawn: 6, lost: 6, gf: 55, ga: 30, gd: 25, points: 60 },
    { position: 5, team: 'Aston Villa', played: 30, won: 16, drawn: 6, lost: 8, gf: 50, ga: 35, gd: 15, points: 54 },
    { position: 6, team: 'Newcastle', played: 30, won: 15, drawn: 7, lost: 8, gf: 48, ga: 32, gd: 16, points: 52 },
    { position: 7, team: 'Tottenham', played: 30, won: 14, drawn: 6, lost: 10, gf: 52, ga: 40, gd: 12, points: 48 },
    { position: 8, team: 'Brighton', played: 30, won: 13, drawn: 7, lost: 10, gf: 48, ga: 42, gd: 6, points: 46 },
    { position: 9, team: 'Man United', played: 30, won: 12, drawn: 6, lost: 12, gf: 40, ga: 42, gd: -2, points: 42 },
    { position: 10, team: 'Bournemouth', played: 30, won: 11, drawn: 7, lost: 12, gf: 42, ga: 45, gd: -3, points: 40 },
    { position: 11, team: 'West Ham', played: 30, won: 11, drawn: 5, lost: 14, gf: 38, ga: 48, gd: -10, points: 38 },
    { position: 12, team: 'Fulham', played: 30, won: 10, drawn: 7, lost: 13, gf: 36, ga: 44, gd: -8, points: 37 },
    { position: 13, team: 'Crystal Palace', played: 30, won: 9, drawn: 8, lost: 13, gf: 34, ga: 42, gd: -8, points: 35 },
    { position: 14, team: 'Wolves', played: 30, won: 9, drawn: 7, lost: 14, gf: 32, ga: 46, gd: -14, points: 34 },
    { position: 15, team: 'Brentford', played: 30, won: 8, drawn: 8, lost: 14, gf: 36, ga: 48, gd: -12, points: 32 },
    { position: 16, team: 'Nott\'m Forest', played: 30, won: 8, drawn: 7, lost: 15, gf: 30, ga: 44, gd: -14, points: 31 },
    { position: 17, team: 'Everton', played: 30, won: 7, drawn: 8, lost: 15, gf: 28, ga: 44, gd: -16, points: 29 },
    { position: 18, team: 'Leicester', played: 30, won: 6, drawn: 6, lost: 18, gf: 26, ga: 52, gd: -26, points: 24 },
    { position: 19, team: 'Ipswich', played: 30, won: 5, drawn: 6, lost: 19, gf: 22, ga: 54, gd: -32, points: 21 },
    { position: 20, team: 'Southampton', played: 30, won: 3, drawn: 5, lost: 22, gf: 18, ga: 60, gd: -42, points: 14 },
  ];
}

const CHELSEA_FIXTURES = {
  recent: [
    { date: '2026-03-22', home: 'Chelsea', away: 'Tottenham', score: '3-1', result: 'W' },
    { date: '2026-03-15', home: 'Newcastle', away: 'Chelsea', score: '1-2', result: 'W' },
    { date: '2026-03-08', home: 'Chelsea', away: 'West Ham', score: '2-2', result: 'D' },
  ],
  upcoming: [
    { date: '2026-03-29', home: 'Aston Villa', away: 'Chelsea', time: '17:30' },
    { date: '2026-04-05', home: 'Chelsea', away: 'Man United', time: '15:00' },
    { date: '2026-04-12', home: 'Brighton', away: 'Chelsea', time: '14:00' },
  ],
};

export async function GET() {
  // Check cache
  if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
    return NextResponse.json(cache.data);
  }

  const plStandings = await fetchPremierLeague();

  const data = {
    linfield: {
      name: 'Linfield FC',
      league: 'NIFL Premiership',
      color: '#003DA5',
      standings: NIFL_STANDINGS,
      fixtures: LINFIELD_FIXTURES,
    },
    chelsea: {
      name: 'Chelsea FC',
      league: 'Premier League',
      color: '#034694',
      standings: plStandings,
      fixtures: CHELSEA_FIXTURES,
    },
  };

  cache = { data, timestamp: Date.now() };
  return NextResponse.json(data);
}

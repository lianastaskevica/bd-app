'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import styles from './Charts.module.scss';

const COLORS = ['#22d3ee', '#a855f7', '#f97316', '#ec4899', '#3b82f6', '#10b981'];

interface CallsByCategoryData {
  name: string;
  value: number;
}

export function CallsByCategory({ data }: { data: CallsByCategoryData[] }) {
  return (
    <div className={styles.chartContainer}>
      <h3 className={styles.chartTitle}>Calls by Category</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={5}
            dataKey="value"
            label={({ name, value }) => `${name}: ${value}`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a2332',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#f8fafc',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {data.length === 0 && (
        <div className={styles.noData}>No data available</div>
      )}
    </div>
  );
}

interface RatingData {
  name: string;
  rating: number;
}

export function RatingByClient({ data }: { data: RatingData[] }) {
  return (
    <div className={styles.chartContainer}>
      <h3 className={styles.chartTitle}>Rating by Client</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical" margin={{ left: 100 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis type="number" domain={[0, 10]} stroke="#94a3b8" />
          <YAxis type="category" dataKey="name" stroke="#94a3b8" width={90} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a2332',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#f8fafc',
            }}
            formatter={(value: any) => [value.toFixed(1), 'Rating']}
          />
          <Bar dataKey="rating" fill="#22d3ee" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
      {data.length === 0 && (
        <div className={styles.noData}>No data available</div>
      )}
    </div>
  );
}

export function RatingByOrganizer({ data }: { data: RatingData[] }) {
  return (
    <div className={styles.chartContainer}>
      <h3 className={styles.chartTitle}>Rating by Organizer</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="name" stroke="#94a3b8" />
          <YAxis domain={[0, 10]} stroke="#94a3b8" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a2332',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#f8fafc',
            }}
            formatter={(value: any) => [value.toFixed(1), 'Rating']}
          />
          <Bar dataKey="rating" fill="#a855f7" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      {data.length === 0 && (
        <div className={styles.noData}>No data available</div>
      )}
    </div>
  );
}

export function RatingByCategory({ data }: { data: RatingData[] }) {
  return (
    <div className={styles.chartContainer}>
      <h3 className={styles.chartTitle}>Rating by Category</h3>
      {data.length === 0 ? (
        <div className={styles.noData}>No data available</div>
      ) : (
        <div className={styles.categoryGrid}>
          {data.map((category, index) => (
            <div 
              key={category.name} 
              className={styles.categoryCard}
              style={{ 
                '--category-color': COLORS[index % COLORS.length],
                borderColor: COLORS[index % COLORS.length]
              } as React.CSSProperties}
            >
              <div className={styles.categoryName}>{category.name}</div>
              <div className={styles.categoryRating}>
                <span className={styles.ratingNumber}>{category.rating.toFixed(1)}</span>
                <span className={styles.ratingMax}>/10</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


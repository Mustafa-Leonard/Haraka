import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusPill } from '../../components/ui/StatusPill';
import { apiClient } from '@haraka/api-client';
import type { JobSummaryDto } from '@haraka/shared-types';
import { PackageSearch } from 'lucide-react';

export const MerchantJobsPage: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobSummaryDto[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchJobs = async (p = 1) => {
    setIsLoading(true);
    try {
      const res = await apiClient.getMerchantJobs(p, 10);
      setJobs(res.data);
      setPage(res.meta.page);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      console.error('Failed to load merchant jobs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs(page);
  }, [page]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
            Deliveries History
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem' }}>
            All active, delivered, and past shipments from your business.
          </p>
        </div>
        <Button onClick={() => navigate('/merchant/new-delivery')}>
          + New Delivery
        </Button>
      </div>

      <Card style={{ padding: '24px' }}>
        {jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-muted)' }}>
            <PackageSearch size={36} aria-hidden="true" style={{ marginBottom: 8, color: 'var(--color-brand)' }} />
            <p>No deliveries found.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>REFERENCE</th>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>RECIPIENT</th>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>ROUTE</th>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>VEHICLE</th>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>STATUS</th>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>AMOUNT</th>
                  <th style={{ padding: '12px 10px', fontWeight: 600, textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '14px 10px', fontWeight: 700, color: 'var(--color-brand)' }}>
                      {job.referenceCode}
                    </td>
                    <td style={{ padding: '14px 10px' }}>{job.recipientName}</td>
                    <td style={{ padding: '14px 10px' }}>
                      {job.pickupTown} → {job.dropoffTown}
                    </td>
                    <td style={{ padding: '14px 10px' }}>{job.vehicleType}</td>
                    <td style={{ padding: '14px 10px' }}>
                      <StatusPill status={job.status} />
                    </td>
                    <td style={{ padding: '14px 10px', fontWeight: 600 }}>
                      KES {(job.quotedAmount / 100).toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 10px', textAlign: 'right' }}>
                      <Button size="sm" variant="secondary" onClick={() => navigate(`/merchant/jobs/${job.id}`)}>
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
          <Button
            size="sm"
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Previous
          </Button>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
            Page {page} of {totalPages || 1}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </Button>
        </div>
      </Card>
    </div>
  );
};

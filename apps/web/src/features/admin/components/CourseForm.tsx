// CourseForm — Create/edit course form (Rows 99-101)
// Fields: name, description, instructor, price, capacity, status

import { useEffect, useState } from 'react';
import {
  createCourse,
  updateCourse,
  listInstructors,
  type Course,
  type CourseStatus,
  type Instructor,
} from '../adminCoursesClient';

interface CourseFormProps {
  tenantId: string;
  course?: Course | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CourseForm({ tenantId, course, onSuccess, onCancel }: CourseFormProps) {
  const [title, setTitle] = useState(course?.title ?? '');
  const [description, setDescription] = useState(course?.description ?? '');
  const [teacherId, setTeacherId] = useState(course?.teacher_id ?? '');
  const [price, setPrice] = useState(course?.price?.toString() ?? '0');
  const [capacity, setCapacity] = useState(course?.capacity?.toString() ?? '');
  const [status, setStatus] = useState<CourseStatus>(course?.status ?? 'draft');
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingInstructors, setLoadingInstructors] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInstructors() {
      const { data } = await listInstructors(tenantId);
      if (data) setInstructors(data);
      setLoadingInstructors(false);
    }
    loadInstructors();
  }, [tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Course name is required.');
      return;
    }
    if (!teacherId) {
      setError('Please assign an instructor.');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Price must be a valid number (0 or greater).');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      tenant_id: tenantId,
      title: title.trim(),
      description: description.trim() || undefined,
      teacher_id: teacherId,
      price: priceNum,
      capacity: capacity ? parseInt(capacity, 10) : undefined,
      status,
    };

    let result;
    if (course) {
      result = await updateCourse(course.id, payload);
    } else {
      result = await createCourse(payload);
    }

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>{course ? 'Edit Course' : 'Create New Course'}</h2>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Course Name */}
        <div style={styles.field}>
          <label style={styles.label}>Course Name *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Introduction to Mathematics"
            style={styles.input}
            required
          />
        </div>

        {/* Description */}
        <div style={styles.field}>
          <label style={styles.label}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Course description..."
            rows={4}
            style={styles.textarea}
          />
        </div>

        {/* Instructor */}
        <div style={styles.field}>
          <label style={styles.label}>Instructor *</label>
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            style={styles.select}
            required
          >
            <option value="">
              {loadingInstructors ? 'Loading instructors...' : 'Select instructor'}
            </option>
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.email})
              </option>
            ))}
          </select>
        </div>

        {/* Price + Capacity row */}
        <div style={styles.row}>
          <div style={{ ...styles.field, flex: 1 }}>
            <label style={styles.label}>Price (USD) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              style={styles.input}
              required
            />
          </div>
          <div style={{ ...styles.field, flex: 1 }}>
            <label style={styles.label}>Capacity (optional)</label>
            <input
              type="number"
              min="1"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="Unlimited"
              style={styles.input}
            />
          </div>
        </div>

        {/* Status */}
        <div style={styles.field}>
          <label style={styles.label}>Status</label>
          <div style={styles.statusRow}>
            <button
              type="button"
              onClick={() => setStatus('draft')}
              style={status === 'draft' ? styles.statusActive : styles.statusButton}
            >
              Draft
            </button>
            <button
              type="button"
              onClick={() => setStatus('published')}
              style={status === 'published' ? styles.statusActivePublished : styles.statusButton}
            >
              Published
            </button>
          </div>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button type="button" onClick={onCancel} style={styles.cancelButton}>
            Cancel
          </button>
          <button type="submit" disabled={loading} style={styles.submitButton}>
            {loading ? 'Saving...' : course ? 'Save Changes' : 'Create Course'}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '600px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0 0 20px 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#4a5568',
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    fontSize: '14px',
  },
  textarea: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    fontSize: '14px',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    fontSize: '14px',
  },
  row: {
    display: 'flex',
    gap: '16px',
  },
  statusRow: {
    display: 'flex',
    gap: '8px',
  },
  statusButton: {
    padding: '8px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    background: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#4a5568',
  },
  statusActive: {
    padding: '8px 16px',
    border: '1px solid #4a5568',
    borderRadius: '4px',
    background: '#4a5568',
    cursor: 'pointer',
    fontSize: '14px',
    color: 'white',
    fontWeight: '500',
  },
  statusActivePublished: {
    padding: '8px 16px',
    border: '1px solid #27ae60',
    borderRadius: '4px',
    background: '#27ae60',
    cursor: 'pointer',
    fontSize: '14px',
    color: 'white',
    fontWeight: '500',
  },
  error: {
    padding: '10px 14px',
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '12px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '8px',
  },
  cancelButton: {
    padding: '8px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    background: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#4a5568',
  },
  submitButton: {
    padding: '8px 20px',
    backgroundColor: '#3182ce',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
};

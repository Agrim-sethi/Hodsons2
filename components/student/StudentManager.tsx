import React from 'react';
import { Icon } from '../Icon';
import { useStaffAuth } from '../auth/StaffAuthProvider';
import { useToast } from '../ui/ToastProvider';
import {
  deleteManagedStudent,
  getAthleticsCategoryForStudent,
  getManagedStudentById,
  getManagedStudents,
  getStudentAgeOnAthleticsDate,
  ManagedStudent,
  StudentCategory,
  StudentDepartment,
  saveManagedStudent,
} from '../../utils/studentStorage';

const emptyForm = {
  id: '',
  name: '',
  dob: '',
  house: 'Vindhya' as ManagedStudent['house'],
  department: 'BD' as StudentDepartment,
  className: '',
};

const departmentLabels: Record<StudentDepartment, string> = {
  PDB: 'Prep Boys (PDB)',
  PDG: 'Prep Girls (PDG)',
  BD: 'Senior Boys (BD)',
  GD: 'Senior Girls (GD)',
};

const categoryLabel = (category: StudentCategory | null) => category || 'Enter a valid DOB and department';

export default function StudentManager() {
  const { isLoggedIn } = useStaffAuth();
  const { showToast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);
  const [search, setSearch] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const managedStudents = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return getManagedStudents()
      .filter((student) => student.id.includes(term) || student.name.toLowerCase().includes(term))
      .slice(0, 8);
  }, [search, open]);

  const calculatedCategory = form.dob
    ? getAthleticsCategoryForStudent(form.department, form.dob)
    : null;
  const age = form.dob ? getStudentAgeOnAthleticsDate(form.dob) : null;
  const existingStudent = form.id ? getManagedStudentById(form.id) : null;

  if (!isLoggedIn) return null;

  const openManager = () => {
    setForm(emptyForm);
    setSearch('');
    setMessage('');
    setOpen(true);
  };

  const loadStudent = (id: string) => {
    const student = getManagedStudentById(id);
    if (!student) return;
    setForm({
      id: student.id,
      name: student.name,
      dob: student.dob || '',
      house: student.house,
      department: student.department,
      className: student.className || '',
    });
    setMessage('Existing student loaded. Saving will update this record.');
    setSearch('');
  };

  const handleVerify = () => {
    if (!form.dob || !form.department) {
      setMessage('Enter a date of birth and department first.');
      return;
    }
    const category = getAthleticsCategoryForStudent(form.department, form.dob);
    if (!category) {
      setMessage('The date of birth is invalid for category verification.');
      return;
    }
    setMessage(`Verified: ${category} (${age} years old on 4 October 2026).`);
  };

  const handleSave = async () => {
    const id = form.id.trim();
    const name = form.name.trim();
    const className = form.className.trim();
    if (!/^\d{5}$/.test(id)) {
      showToast({ title: 'Invalid Comp No.', description: 'Competition number must be exactly 5 digits.' });
      return;
    }
    if (!name || !form.dob || !form.house || !form.department || !className) {
      showToast({ title: 'Missing Details', description: 'Comp No., name, DOB, house, department and class are all required.' });
      return;
    }

    const category = getAthleticsCategoryForStudent(form.department, form.dob);
    if (!category) {
      showToast({ title: 'Invalid DOB', description: 'Enter a valid date of birth before saving.' });
      return;
    }

    const existing = getManagedStudentById(id);
    const student: ManagedStudent = {
      id,
      name,
      dob: form.dob,
      house: form.house,
      department: form.department,
      category,
      className,
      updatedAt: new Date().toISOString(),
    };

    try {
      setSaving(true);
      await saveManagedStudent(student);
      setSaving(false);
      showToast({
        title: existing ? 'Student Updated' : 'Student Added',
        description: `${name} → ${category}`,
      });
      setMessage(`${existing ? 'Updated' : 'Added'} successfully. Reloading the app to refresh Athletics data.`);
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      setSaving(false);
      console.error(error);
      showToast({ title: 'Save Failed', description: 'The student could not be saved to Firebase.' });
    }
  };

  const handleDelete = async () => {
    if (!existingStudent) return;

    const confirmed = window.confirm(
      `Delete ${existingStudent.name} (${existingStudent.id}) from the managed student dataset? This will remove the student from Athletics categories and cannot be undone from the app.`
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      await deleteManagedStudent(existingStudent.id);
      setDeleting(false);
      showToast({ title: 'Student Deleted', description: `${existingStudent.name} has been removed.` });
      setForm(emptyForm);
      setSearch('');
      setMessage('Student deleted successfully. Reloading the app to refresh Athletics data.');
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      setDeleting(false);
      console.error(error);
      showToast({ title: 'Delete Failed', description: 'The student could not be deleted from Firebase.' });
    }
  };

  return (
    <>
      <button
        onClick={openManager}
        className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-5 py-3 text-xs font-black uppercase tracking-wider text-primary shadow-lg hover:bg-primary/20 transition-all whitespace-nowrap"
      >
        <Icon name="person_add" size="18" /> Add / Manage Students
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-white/10 max-h-[92vh] flex flex-col">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent">
              <div>
                <div className="royal-kicker">Student Management</div>
                <h2 className="text-xl font-bold text-white mt-1">Add / Update Athletics Student</h2>
                <p className="text-xs text-slate-500 mt-1">Category is calculated from DOB and department on 4 October 2026.</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white"><Icon name="close" size="24" /></button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Find Existing Student</label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by comp no. or name"
                  className="royal-input w-full rounded-xl px-3 py-2.5 text-sm"
                />
                {managedStudents.length > 0 && (
                  <div className="space-y-1">
                    {managedStudents.map((student) => (
                      <button
                        key={student.id}
                        onClick={() => loadStudent(student.id)}
                        className="w-full rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-left hover:bg-white/[0.06] transition"
                      >
                        <div className="flex justify-between gap-3">
                          <span className="text-sm font-semibold text-white">{student.name}</span>
                          <span className="text-xs font-mono text-slate-500">{student.id}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">{student.house} • {student.department} • {student.category}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Competition No. *</label>
                  <input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value.replace(/\D/g, '').slice(0, 5) })} inputMode="numeric" placeholder="e.g. 06045" className="royal-input w-full mt-1 rounded-xl px-3 py-2.5 text-sm font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Student Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="royal-input w-full mt-1 rounded-xl px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Date of Birth *</label>
                  <input value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} type="date" className="royal-input w-full mt-1 rounded-xl px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Class *</label>
                  <input value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} placeholder="e.g. 9 D" className="royal-input w-full mt-1 rounded-xl px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">House *</label>
                  <select value={form.house} onChange={(e) => setForm({ ...form, house: e.target.value as ManagedStudent['house'] })} className="royal-input w-full mt-1 rounded-xl px-3 py-2.5 text-sm">
                    <option value="Vindhya">Vindhya</option>
                    <option value="Himalaya">Himalaya</option>
                    <option value="Nilgiri">Nilgiri</option>
                    <option value="Siwalik">Siwalik</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Department *</label>
                  <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value as StudentDepartment })} className="royal-input w-full mt-1 rounded-xl px-3 py-2.5 text-sm">
                    {Object.entries(departmentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
              </div>

              <div className={`rounded-xl border p-5 ${calculatedCategory ? 'border-emerald-500/20 bg-emerald-500/[0.05]' : 'border-primary/10 bg-primary/[0.03]'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="royal-kicker">Category Verification</div>
                    <div className="text-lg font-black text-white mt-1">{categoryLabel(calculatedCategory)}</div>
                    {age !== null && <p className="text-xs text-slate-400 mt-1">Age on 4 October 2026: <span className="text-white font-semibold">{age}</span></p>}
                  </div>
                  <button onClick={handleVerify} className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/20">Verify Category</button>
                </div>
                {message && <p className="text-xs text-slate-400 mt-3">{message}</p>}
              </div>

              <div className="flex flex-col gap-3 pt-1">
                <div className="flex gap-3">
                  <button onClick={() => setOpen(false)} className="flex-1 rounded-xl bg-white/5 text-white border border-white/10 py-3 text-xs font-black uppercase">Cancel</button>
                  <button disabled={saving || deleting} onClick={handleSave} className="flex-1 rounded-xl bg-primary px-4 py-3 text-xs font-black uppercase tracking-widest text-background-dark hover:brightness-110 disabled:opacity-60">{saving ? 'Saving…' : 'Save Student'}</button>
                </div>
                {existingStudent && (
                  <button
                    disabled={saving || deleting}
                    onClick={handleDelete}
                    className="w-full rounded-xl border border-red-500/30 bg-red-500/10 py-3 text-xs font-black uppercase tracking-widest text-red-300 hover:bg-red-500/15 disabled:opacity-60"
                  >
                    {deleting ? 'Deleting…' : 'Delete Student'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

<script setup lang="ts">
import StudentDashboard from '@/features/teacher/student/components/StudentDashboard.vue'
</script>

<template>
  <StudentDashboard />
</template>

<style scoped>
.dashboard {
  display: grid;
}
.student-list {
  display: grid;
  min-width: 0;
  gap: 20px;
}
.list-toolbar {
  display: flex;
  min-height: 76px;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--slate-200);
}
.list-toolbar h1 {
  margin: 0;
  color: var(--slate-950);
  font-size: 26px;
  line-height: 1.25;
}
.list-toolbar__copy {
  display: grid;
  gap: 5px;
}
.list-toolbar__copy p {
  margin: 0;
  color: var(--slate-500);
  font-size: 12px;
  line-height: 1.55;
}
.list-toolbar__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}
.example-data-button {
  color: var(--slate-600);
  white-space: nowrap;
}
.filter-row {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  align-items: center;
  gap: 9px;
  padding: 0;
}
.filter-row .select {
  width: 132px;
}
.list-controls {
  display: flex;
  align-items: flex-end;
  flex-direction: row;
  gap: 24px;
  overflow: visible;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}
.list-summary {
  display: flex;
  min-height: 40px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 0;
  margin: 0 0 0 auto;
  padding: 0;
}
.list-summary > div {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 0 14px;
}
.list-summary > div:first-child {
  padding-left: 0;
}
.list-summary > div + div {
  border-left: 1px solid var(--border);
}
.list-summary dt {
  color: var(--slate-500);
  font-size: 11px;
}
.list-summary dd {
  margin: 0;
  color: var(--slate-900);
  font-size: 18px;
  font-weight: 800;
}
.list-summary__attention dd {
  color: var(--danger-600);
}
.register-button {
  min-height: 40px;
  white-space: nowrap;
}
.search-field {
  display: flex;
  min-width: 240px;
  flex: 1 1 340px;
  max-width: 440px;
  height: 40px;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border: 1px solid var(--slate-300);
  border-radius: var(--radius-sm);
  background: var(--white);
}
.search-field span {
  color: var(--slate-400);
  font-size: 20px;
}
.search-field input {
  width: 100%;
  border: 0;
  outline: 0;
}
.table-scroll {
  gap: 0;
  overflow: hidden auto;
  padding: 0;
  border-radius: var(--radius-lg);
}
table {
  width: 100%;
  border-collapse: collapse;
  background: var(--white);
}
th,
td {
  height: 68px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--slate-200);
  text-align: left;
  white-space: nowrap;
}
th {
  height: 44px;
  background: var(--slate-50);
  color: var(--slate-500);
  font-size: 11px;
  font-weight: 700;
}
th:first-child,
td:first-child {
  padding-left: 18px;
}
th:last-child,
td:last-child {
  width: 60px;
  padding-right: 14px;
  text-align: right;
}
.student-row {
  transition: background 120ms ease;
}
.student-row:hover {
  background: var(--interactive-hover-background);
}
.student-cell {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
}
.student-cell img {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
}
.student-cell div {
  display: grid;
  gap: 2px;
}
.student-cell strong {
  color: var(--slate-950);
}
.student-cell:hover strong,
.student-cell:focus-visible strong {
  color: var(--primary-600);
}
.student-initial {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: 50%;
  background: var(--primary-50);
  color: var(--primary-700);
  font-size: 14px;
  font-weight: 800;
  place-items: center;
}
.student-cell div span,
.learning-date span,
.weekly-status span {
  color: var(--slate-500);
  font-size: 11px;
}
.current-training {
  color: var(--slate-700);
}
.learning-date,
.weekly-status {
  display: grid;
  gap: 2px;
}
.learning-date strong,
.weekly-status strong {
  font-size: 12px;
}
.weekly-status strong {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--slate-700);
}
.weekly-status strong::before {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--success-600);
  content: '';
}
.weekly-status--attention strong {
  color: var(--danger-600);
}
.weekly-status--attention strong::before {
  background: var(--danger-600);
}
.action-cell {
  position: relative;
}
.more-button {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--slate-500);
  font-size: 18px;
  letter-spacing: 1px;
}
.more-button:hover,
.more-button[aria-expanded='true'] {
  background: var(--slate-100);
  color: var(--slate-950);
}
.row-menu {
  position: absolute;
  z-index: 10;
  top: 50px;
  right: 12px;
  display: grid;
  width: 132px;
  padding: 6px;
  border: 1px solid var(--slate-200);
  border-radius: 8px;
  background: var(--white);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.14);
}
.row-menu button {
  min-height: 34px;
  padding: 0 10px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--slate-700);
  font-size: 12px;
  text-align: left;
}
.row-menu button:hover {
  background: var(--slate-50);
}
.row-menu .row-menu__danger {
  color: var(--danger-600);
}
.empty-row {
  padding: 40px;
  color: var(--slate-500);
  text-align: center;
}
.table-footer {
  display: flex;
  min-height: 56px;
  align-items: center;
  justify-content: flex-end;
  padding: 12px 16px;
  color: var(--slate-500);
  font-size: 12px;
}
.pagination {
  display: flex;
  align-items: center;
  gap: 5px;
}
.pagination button {
  min-width: 32px;
  height: 32px;
  border: 1px solid var(--slate-200);
  border-radius: 7px;
  background: var(--white);
}
.pagination button.active {
  border-color: var(--primary-600);
  background: var(--primary-600);
  color: var(--white);
}

@media (max-width: 900px) {
  .list-controls {
    align-items: stretch;
    flex-direction: column;
    flex-wrap: wrap;
    gap: 12px;
  }

  .filter-row {
    flex-wrap: wrap;
  }

  .search-field {
    max-width: none;
    flex-basis: 100%;
  }

  .list-summary {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .list-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .register-button {
    align-self: flex-start;
  }

  .list-toolbar__actions {
    align-self: flex-start;
  }

  .list-summary > div,
  .list-summary > div:first-child {
    padding: 0 10px;
  }

  .list-summary > div + div {
    border-left: 1px solid var(--border);
  }
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>

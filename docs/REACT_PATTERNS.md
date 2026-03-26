# React Patterns (v1)

## State management

- **Server state:** TanStack Query only. No global Redux/store. Use query keys (e.g. `['observations']`, `['observations', id]`) and invalidate after mutations.
- **Local state:** `useState` for forms (e.g. fast capture modal). Clear or reset on submit success.
- **State that depends on previous state:** Use functional updates: `setState(prev => ...)` (e.g. when adding/removing link ids in capture form).

## Forms

- Controlled components for all inputs. Map form state to API payload on submit.
- On mutation success: call TanStack Query `invalidateQueries` for affected lists/dashboard, then close modal or navigate.

## Data fetching

- Use TanStack Query `useQuery` for GET; `useMutation` for POST/PATCH/DELETE. In mutations, `onSuccess` invalidate related queries.
- API client: single helper (e.g. `api.get`, `api.post`) from `app/src/lib/api.ts`; base URL from env.

## Keys and lists

- Use stable `key` from entity `id` for list items. No index as key when list can reorder.

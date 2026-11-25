import { ROTULOS_STATUS } from '../utils/formatadores';

export default function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${status}`}>{ROTULOS_STATUS[status] || status}</span>
  );
}

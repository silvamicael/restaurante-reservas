import StatusBadge from './StatusBadge';
import { formatarData, formatarHorario } from '../utils/formatadores';

export default function ReservaList({ reservas, onStatusChange, onCancelar, onEditar, ocupado }) {
  if (!reservas.length) {
    return <p className="vazio">Nenhuma reserva encontrada.</p>;
  }

  return (
    <div className="tabela-wrapper">
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Contato</th>
            <th>Data</th>
            <th>Horário</th>
            <th>Pessoas</th>
            <th>Status</th>
            <th>Observações</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {reservas.map((r) => (
            <tr key={r.id}>
              <td>{r.nome}</td>
              <td>
                {r.telefone && <div>{r.telefone}</div>}
                {r.email && <div className="secundario-texto">{r.email}</div>}
              </td>
              <td>{formatarData(r.data_reserva)}</td>
              <td>{formatarHorario(r.horario)}</td>
              <td>{r.quantidade_pessoas}</td>
              <td>
                <StatusBadge status={r.status} />
              </td>
              <td>{r.observacoes || '—'}</td>
              <td>
                <div className="acoes-linha">
                  {r.status === 'pendente' && (
                    <button disabled={ocupado} onClick={() => onStatusChange(r.id, 'confirmada')}>
                      Confirmar
                    </button>
                  )}
                  {r.status === 'confirmada' && (
                    <button disabled={ocupado} onClick={() => onStatusChange(r.id, 'concluida')}>
                      Concluir
                    </button>
                  )}
                  {r.status === 'cancelada' && (
                    <button disabled={ocupado} onClick={() => onStatusChange(r.id, 'pendente')}>
                      Reativar
                    </button>
                  )}
                  {(r.status === 'pendente' || r.status === 'confirmada') && (
                    <>
                      <button className="secundario" disabled={ocupado} onClick={() => onEditar(r)}>
                        Editar
                      </button>
                      <button className="perigo" disabled={ocupado} onClick={() => onCancelar(r.id)}>
                        Cancelar
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

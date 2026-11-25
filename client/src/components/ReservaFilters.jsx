import { ROTULOS_STATUS } from '../utils/formatadores';

export default function ReservaFilters({ valores, onChange, onPesquisar, onLimpar }) {
  const alterar = (event) => {
    const { name, value } = event.target;
    onChange({ ...valores, [name]: value });
  };

  const enviar = (event) => {
    event.preventDefault();
    onPesquisar();
  };

  return (
    <form className="filtros" onSubmit={enviar}>
      <label>
        Nome do cliente
        <input name="nome" value={valores.nome} onChange={alterar} placeholder="Ex.: Mariana" />
      </label>

      <label>
        Data
        <input name="data" type="date" value={valores.data} onChange={alterar} />
      </label>

      <label>
        Status
        <select name="status" value={valores.status} onChange={alterar}>
          <option value="">Todos</option>
          {Object.entries(ROTULOS_STATUS).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
      </label>

      <div className="acoes-filtro">
        <button type="submit">Pesquisar</button>
        <button type="button" className="secundario" onClick={onLimpar}>
          Limpar filtros
        </button>
      </div>
    </form>
  );
}

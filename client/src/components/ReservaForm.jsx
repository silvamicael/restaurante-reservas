import { useMemo, useState } from 'react';
import { errosPorCampo, mensagemDeErro } from '../services/api';
import { formatarHorario, hojeISO } from '../utils/formatadores';

const estadoInicial = {
  nome: '',
  telefone: '',
  email: '',
  data_reserva: '',
  horario: '',
  quantidade_pessoas: 2,
  observacoes: ''
};

function formularioDe(reserva) {
  if (!reserva) return estadoInicial;
  return {
    nome: reserva.nome || '',
    telefone: reserva.telefone || '',
    email: reserva.email || '',
    data_reserva: String(reserva.data_reserva).slice(0, 10),
    horario: formatarHorario(reserva.horario),
    quantidade_pessoas: reserva.quantidade_pessoas,
    observacoes: reserva.observacoes || ''
  };
}

/**
 * Formulário usado para CRIAR (sem `reserva`) e para EDITAR (com `reserva`).
 * `onSalvar(dados)` deve devolver uma Promise e lançar erro se a API recusar.
 */
export default function ReservaForm({ config, reserva, onSalvar, onCancelar }) {
  const editando = Boolean(reserva);
  const [form, setForm] = useState(() => formularioDe(reserva));
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);

  const hoje = useMemo(() => hojeISO(), []);

  const alterar = (event) => {
    const { name, value } = event.target;
    setForm((atual) => ({ ...atual, [name]: value }));
    setErros((atual) => ({ ...atual, [name]: undefined }));
  };

  // Validação básica no navegador (a API valida novamente: a validação real é a do backend).
  const validar = () => {
    const e = {};
    if (form.nome.trim().length < 2) e.nome = 'Informe o nome (mínimo de 2 caracteres).';
    if (!form.telefone.trim() && !form.email.trim()) {
      e.telefone = 'Informe telefone ou e-mail para contato.';
    }
    if (!form.data_reserva) e.data_reserva = 'Escolha a data.';
    else if (form.data_reserva < hoje) e.data_reserva = 'A data não pode estar no passado.';
    if (!form.horario) e.horario = 'Escolha o horário.';
    const qtd = Number(form.quantidade_pessoas);
    if (!Number.isInteger(qtd) || qtd < 1) {
      e.quantidade_pessoas = 'Informe um número inteiro de pessoas (mínimo 1).';
    } else if (qtd > config.maxPessoasPorReserva) {
      e.quantidade_pessoas = `No máximo ${config.maxPessoasPorReserva} pessoas por reserva.`;
    }
    return e;
  };

  const enviar = async (event) => {
    event.preventDefault();
    setErroGeral('');
    const encontrados = validar();
    setErros(encontrados);
    if (Object.keys(encontrados).length) return;

    try {
      setEnviando(true);
      await onSalvar({ ...form, quantidade_pessoas: Number(form.quantidade_pessoas) });
      if (!editando) setForm(estadoInicial);
    } catch (error) {
      setErros(errosPorCampo(error));
      setErroGeral(mensagemDeErro(error, 'Não foi possível salvar a reserva.'));
    } finally {
      setEnviando(false);
    }
  };

  // Ao editar, mantém na lista o horário atual mesmo que ele tenha saído da grade padrão.
  const horarios = config.horarios.includes(form.horario) || !form.horario
    ? config.horarios
    : [form.horario, ...config.horarios];

  return (
    <form className="form-reserva" onSubmit={enviar} noValidate>
      <label>
        Nome
        <input name="nome" value={form.nome} onChange={alterar} maxLength={120} />
        {erros.nome && <span className="erro-campo">{erros.nome}</span>}
      </label>

      <label>
        Telefone
        <input
          name="telefone"
          value={form.telefone}
          onChange={alterar}
          placeholder="(48) 99999-0000"
          maxLength={30}
        />
        {erros.telefone && <span className="erro-campo">{erros.telefone}</span>}
      </label>

      <label>
        E-mail
        <input name="email" type="email" value={form.email} onChange={alterar} maxLength={160} />
        {erros.email && <span className="erro-campo">{erros.email}</span>}
      </label>

      <label>
        Data
        <input
          name="data_reserva"
          type="date"
          min={hoje}
          value={form.data_reserva}
          onChange={alterar}
        />
        {erros.data_reserva && <span className="erro-campo">{erros.data_reserva}</span>}
      </label>

      <label>
        Horário
        <select name="horario" value={form.horario} onChange={alterar}>
          <option value="">Selecione...</option>
          {horarios.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        {erros.horario && <span className="erro-campo">{erros.horario}</span>}
      </label>

      <label>
        Quantidade de pessoas
        <input
          name="quantidade_pessoas"
          type="number"
          min="1"
          max={config.maxPessoasPorReserva}
          value={form.quantidade_pessoas}
          onChange={alterar}
        />
        {erros.quantidade_pessoas && <span className="erro-campo">{erros.quantidade_pessoas}</span>}
      </label>

      <label className="campo-largo">
        Observações
        <textarea
          name="observacoes"
          value={form.observacoes}
          onChange={alterar}
          maxLength={500}
          rows={3}
        />
        {erros.observacoes && <span className="erro-campo">{erros.observacoes}</span>}
      </label>

      {erroGeral && (
        <p className="alerta alerta-erro campo-largo" role="alert">
          {erroGeral}
        </p>
      )}

      <div className="acoes-form campo-largo">
        <button type="submit" disabled={enviando}>
          {enviando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Solicitar reserva'}
        </button>
        {onCancelar && (
          <button type="button" className="secundario" onClick={onCancelar} disabled={enviando}>
            Fechar
          </button>
        )}
      </div>
    </form>
  );
}

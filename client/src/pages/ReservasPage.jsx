import { useCallback, useEffect, useRef, useState } from 'react';
import ReservaFilters from '../components/ReservaFilters';
import ReservaForm from '../components/ReservaForm';
import ReservaList from '../components/ReservaList';
import { mensagemDeErro } from '../services/api';
import {
  atualizarReserva,
  atualizarStatusReserva,
  cancelarReserva,
  criarReserva,
  listarReservas,
  obterConfiguracao
} from '../services/reservasService';
import { gerarHorariosPadrao } from '../utils/formatadores';

const FILTROS_VAZIOS = { nome: '', data: '', status: '' };

const CONFIG_PADRAO = {
  maxPessoasPorReserva: 12,
  maxPessoasPorHorario: 30,
  horarioAbertura: '11:00',
  horarioUltimaReserva: '22:00',
  horarios: gerarHorariosPadrao()
};

export default function ReservasPage() {
  const [config, setConfig] = useState(CONFIG_PADRAO);
  const [reservas, setReservas] = useState([]);
  const [rascunho, setRascunho] = useState(FILTROS_VAZIOS); // o que está digitado
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS); // o que foi aplicado na pesquisa
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState('');
  const [mensagem, setMensagem] = useState(null); // { tipo: 'sucesso' | 'erro', texto }
  const [editando, setEditando] = useState(null);
  const [processando, setProcessando] = useState(false);
  const temporizador = useRef(null);

  const avisar = useCallback((tipo, texto) => {
    setMensagem({ tipo, texto });
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setMensagem(null), 5000);
  }, []);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  // Configuração do restaurante (horários e limites) vinda da API
  useEffect(() => {
    obterConfiguracao()
      .then((resposta) => setConfig(resposta.data))
      .catch(() => {
        /* mantém a configuração padrão; o erro de conexão aparece na listagem */
      });
  }, []);

  const carregar = useCallback(async () => {
    try {
      setErroLista('');
      setCarregando(true);
      const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
      const resposta = await listarReservas(params);
      setReservas(resposta.data);
    } catch (error) {
      setReservas([]);
      setErroLista(mensagemDeErro(error, 'Não foi possível carregar as reservas.'));
    } finally {
      setCarregando(false);
    }
  }, [filtros]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const pesquisar = () => setFiltros({ ...rascunho });

  const limpar = () => {
    setRascunho(FILTROS_VAZIOS);
    setFiltros(FILTROS_VAZIOS);
  };

  const criar = async (dados) => {
    await criarReserva(dados); // se falhar, o formulário mostra o erro
    avisar('sucesso', 'Reserva criada com sucesso!');
    await carregar();
  };

  const salvarEdicao = async (dados) => {
    await atualizarReserva(editando.id, dados);
    setEditando(null);
    avisar('sucesso', 'Reserva atualizada com sucesso!');
    await carregar();
  };

  const alterarStatus = async (id, status) => {
    try {
      setProcessando(true);
      await atualizarStatusReserva(id, status);
      avisar('sucesso', 'Status da reserva atualizado.');
      await carregar();
    } catch (error) {
      avisar('erro', mensagemDeErro(error, 'Falha ao atualizar o status.'));
    } finally {
      setProcessando(false);
    }
  };

  const cancelar = async (id) => {
    if (!window.confirm('Deseja cancelar esta reserva?')) return;
    try {
      setProcessando(true);
      await cancelarReserva(id);
      avisar('sucesso', 'Reserva cancelada.');
      await carregar();
    } catch (error) {
      avisar('erro', mensagemDeErro(error, 'Falha ao cancelar a reserva.'));
    } finally {
      setProcessando(false);
    }
  };

  return (
    <main>
      <header className="topo">
        <h1>Reservas do Restaurante</h1>
        <p>
          Funcionamento: reservas das {config.horarioAbertura} às {config.horarioUltimaReserva}. Até{' '}
          {config.maxPessoasPorReserva} pessoas por reserva e {config.maxPessoasPorHorario} por horário.
        </p>
      </header>

      {mensagem && (
        <div className={`alerta alerta-${mensagem.tipo}`} role={mensagem.tipo === 'erro' ? 'alert' : 'status'}>
          {mensagem.texto}
        </div>
      )}

      <section>
        <h2>Nova reserva</h2>
        <ReservaForm config={config} onSalvar={criar} />
      </section>

      <section>
        <h2>Pesquisar reservas</h2>
        <ReservaFilters
          valores={rascunho}
          onChange={setRascunho}
          onPesquisar={pesquisar}
          onLimpar={limpar}
        />
      </section>

      <section>
        <h2>Reservas</h2>
        {erroLista && (
          <p className="alerta alerta-erro" role="alert">
            {erroLista}{' '}
            <button type="button" className="link" onClick={carregar}>
              Tentar novamente
            </button>
          </p>
        )}
        {carregando ? (
          <p className="carregando">Carregando reservas...</p>
        ) : (
          !erroLista && (
            <ReservaList
              reservas={reservas}
              ocupado={processando}
              onStatusChange={alterarStatus}
              onCancelar={cancelar}
              onEditar={setEditando}
            />
          )
        )}
      </section>

      {editando && (
        <div className="modal-fundo" role="dialog" aria-modal="true" aria-label="Editar reserva">
          <div className="modal">
            <h2>Editar reserva #{editando.id}</h2>
            <ReservaForm
              config={config}
              reserva={editando}
              onSalvar={salvarEdicao}
              onCancelar={() => setEditando(null)}
            />
          </div>
        </div>
      )}
    </main>
  );
}

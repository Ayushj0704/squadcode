import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSquadStore } from "../store/squadStore";

export function LegacySquadDashboardRedirect() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setSelectedSquadId = useSquadStore((s) => s.setSelectedSquadId);

  useEffect(() => {
    if (id) setSelectedSquadId(id);
    navigate("/dashboard", { replace: true });
  }, [id, navigate, setSelectedSquadId]);

  return null;
}

export function LegacySquadThreadsRedirect() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setSelectedSquadId = useSquadStore((s) => s.setSelectedSquadId);

  useEffect(() => {
    if (id) setSelectedSquadId(id);
    navigate("/threads", { replace: true });
  }, [id, navigate, setSelectedSquadId]);

  return null;
}

export function LegacySquadThreadDetailRedirect() {
  const { id, thread_id } = useParams();
  const navigate = useNavigate();
  const setSelectedSquadId = useSquadStore((s) => s.setSelectedSquadId);

  useEffect(() => {
    if (id) setSelectedSquadId(id);
    if (thread_id) navigate(`/threads/${thread_id}`, { replace: true });
    else navigate("/threads", { replace: true });
  }, [id, navigate, setSelectedSquadId, thread_id]);

  return null;
}

export function LegacySquadSheetsRedirect() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setSelectedSquadId = useSquadStore((s) => s.setSelectedSquadId);

  useEffect(() => {
    if (id) setSelectedSquadId(id);
    navigate("/sheets", { replace: true });
  }, [id, navigate, setSelectedSquadId]);

  return null;
}

export function LegacySquadSheetDetailRedirect() {
  const { id, sheet_id } = useParams();
  const navigate = useNavigate();
  const setSelectedSquadId = useSquadStore((s) => s.setSelectedSquadId);

  useEffect(() => {
    if (id) setSelectedSquadId(id);
    if (sheet_id) navigate(`/sheets/${sheet_id}`, { replace: true });
    else navigate("/sheets", { replace: true });
  }, [id, navigate, setSelectedSquadId, sheet_id]);

  return null;
}


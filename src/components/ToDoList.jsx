import React, { useEffect, useMemo, useState } from "react";
import "./ToDoList.css";

const fromApi = (item) => ({ id: item.id, texto: item.label, done: !!item.is_done });

function ToDoList() {
    const [tarea, setTarea] = useState("");
    const [tareas, setTareas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    const tieneTareas = useMemo(() => tareas.length > 0, [tareas]);

    useEffect(() => {
        cargarTareas();
    }, []);

    async function cargarTareas() {
        try {
            setCargando(true);
            setError("");

            const resp = await fetch(`https://playground.4geeks.com/todo/users/julia12navio`);
            if (!resp.ok) throw new Error(`Error cargando tareas (${resp.status})`);

            const data = await resp.json();
            const lista = Array.isArray(data.todos) ? data.todos.map(fromApi) : [];
            setTareas(lista);
        } catch (e) {
            setError(e.message || "Error al cargar tareas");
        } finally {
            setCargando(false);
        }
    }

    async function manejarSubmit(e) {
        e.preventDefault();
        const texto = tarea.trim();
        if (!texto) return;

        try {
            setError("");
            const resp = await fetch(`https://playground.4geeks.com/todo/todos/julia12navio`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ label: texto, is_done: false }),
            });
            if (!resp.ok) throw new Error(`No se pudo crear la tarea (${resp.status})`);

            // Refrescar
            await cargarTareas();
            setTarea("");
        } catch (e) {
            setError(e.message || "Error añadiendo tarea");
        }
    }

    async function toggleDone(id) {
        // Busca la tarea que recibe(id) en tareas
        const actual = tareas.find((t) => t.id === id);
        if (!actual) return;

        //cambia el antiguo estado de done por el contrario en local 
        const nuevoDone = !actual.done;
        setTareas((prev) => prev.map((t) => (t.id === id ? { ...t, done: nuevoDone } : t)));

        try {
            //Actualiza la tarea en el backend
            const resp = await fetch(`https://playground.4geeks.com/todo/todos/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ label: actual.texto, is_done: nuevoDone }),
            });

            if (!resp.ok) {
                // falla el servidor, contesta pero indica error - revierte los cambios en local 
                setTareas((prev) => prev.map((t) => (t.id === id ? { ...t, done: !nuevoDone } : t)));
                setError(`No se pudo actualizar la tarea (${resp.status})`);
            }
        } catch (e) {
            // falla la conexión- revierte los cambios en local
            setTareas((prev) => prev.map((t) => (t.id === id ? { ...t, done: !nuevoDone } : t)));
            setError(e.message || "Error actualizando tarea");
        }
    }

    async function eliminarTarea(id) {
        try {
            setError("");
            const resp = await fetch(`https://playground.4geeks.com/todo/todos/${id}`, { method: "DELETE" });
            if (resp.status !== 204 && !resp.ok) {
                throw new Error(`No se pudo eliminar (${resp.status})`);
            }
            await cargarTareas();
        } catch (e) {
            setError(e.message || "Error eliminando tarea");
        }
    }

    async function limpiarTodas() {
        if (!confirm("¿Seguro que quieres borrar TODAS las tareas?")) return;

        if (tareas.length === 0) return; // nada que borrar

        try {
            setError("");
            setCargando(true);

            // guarda las promesas de eliminación
            const deletions = await Promise.all(
                tareas.map(t =>
                    fetch(`https://playground.4geeks.com/todo/todos/${t.id}`, { method: "DELETE" })
                )
            );

            // Si alguna promesa falla 
            const fallos = deletions.filter(r => r.status !== 204 && !r.ok);
            if (fallos.length > 0) {
                throw new Error(`No se pudieron borrar ${fallos.length} tareas (${fallos[0].status})`);
            }

            await cargarTareas();
        } catch (e) {
            setError(e.message || "Error limpiando la lista");
        } finally {
            setCargando(false);
        }
    }

    return (
        <div className="container mt-3">
            <div className="row justify-content-center">
                <div className="col-12 col-md-8 col-lg-6">
                    <h1 className="h4 mb-3 text-center">To Do List</h1>

                    {/* Estado de red */}
                    {cargando && <div className="alert alert-secondary py-2">Cargando…</div>}
                    {error && <div className="alert alert-danger py-2">{error}</div>}

                    {/* Añadir tarea */}
                    <form onSubmit={manejarSubmit} className="mb-3">
                        <div className="row g-2">
                            <div className="col">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Escribe una tarea"
                                    value={tarea}
                                    onChange={(e) => setTarea(e.target.value)}
                                    aria-label="Nueva tarea"
                                    disabled={cargando}
                                />
                            </div>
                            <div className="col-auto">
                                <button type="submit" className="btn btn-primary" disabled={cargando}>
                                    Añadir
                                </button>
                            </div>
                            <div className="col-auto">
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={limpiarTodas}
                                    disabled={cargando || !tieneTareas}
                                    title="Borrar todas las tareas del servidor"
                                >
                                    Limpiar todo
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Lista de tareas */}
                    <ul className="list-group">
                        {tareas.length === 0 ? (
                            <p className="text-center alert alert-info mb-0">No hay tareas, añadir tareas.</p>
                        ) : (
                            tareas.map((t) => (
                                <li
                                    key={t.id}
                                    className="list-group-item d-flex justify-content-between align-items-center list-group-item-action"
                                >
                                    <div className="d-flex align-items-center">
                                        <input
                                            className="form-check-input me-2"
                                            type="checkbox"
                                            id={`checkbox-${t.id}`}
                                            checked={t.done}
                                            onChange={() => toggleDone(t.id)}
                                        />
                                        <label
                                            className="form-check-label"
                                            htmlFor={`checkbox-${t.id}`}
                                            style={{ textDecoration: t.done ? "line-through" : "none" }}
                                        >
                                            {t.texto}
                                        </label>
                                    </div>

                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger d-none"
                                        onClick={() => eliminarTarea(t.id)}
                                        aria-label="Eliminar"
                                        title="Eliminar tarea"
                                    >
                                        ×
                                    </button>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default ToDoList;

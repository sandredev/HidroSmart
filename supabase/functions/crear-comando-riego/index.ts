
import { withSupabase } from "npm:@supabase/server@^1";

export default {
  fetch: withSupabase(
    { auth: "publishable" },
    async (req, ctx) => {
      try {
        if (req.method !== "POST") {
          return Response.json({
            ok: false,
            error: {
              codigo: "METODO_NO_PERMITIDO",
              mensaje: "Solo se permite POST."
            }
          }, { status: 405 });
        }

        const token = req.headers.get("x-operator-token");
        const expectedToken = Deno.env.get("HIDROSMART_OPERATOR_TOKEN");

        if (!expectedToken || token !== expectedToken) {
          return Response.json({
            ok: false,
            error: {
              codigo: "NO_AUTORIZADO",
              mensaje: "Credencial de operador inválida."
            }
          }, { status: 401 });
        }

        const body = await req.json();

        if (
          typeof body.dispositivo_id !== "string" ||
          !body.dispositivo_id.trim() ||
          !["iniciar_riego", "detener_riego"].includes(body.accion)
        ) {
          return Response.json({
            ok: false,
            error: {
              codigo: "DATOS_INVALIDOS",
              mensaje: "Indique un dispositivo y una acción válida."
            }
          }, { status: 422 });
        }

        const { data: dispositivo, error: errorDispositivo } =
          await ctx.supabaseAdmin
            .from("dispositivos")
            .select("id")
            .eq("dispositivo_id", body.dispositivo_id)
            .maybeSingle();

        if (errorDispositivo) {
          console.error(errorDispositivo);
          return Response.json({
            ok: false,
            error: {
              codigo: "ERROR_CONSULTA",
              mensaje: "No fue posible consultar el dispositivo."
            }
          }, { status: 500 });
        }

        if (!dispositivo) {
          return Response.json({
            ok: false,
            error: {
              codigo: "DISPOSITIVO_NO_ENCONTRADO",
              mensaje: "El dispositivo no está registrado."
            }
          }, { status: 404 });
        }

        // Evita acumular órdenes pendientes para el mismo dispositivo.
        const { data: pendientes, error: errorPendientes } =
          await ctx.supabaseAdmin
            .from("comandos_dispositivo")
            .select("id")
            .eq("dispositivo_id", dispositivo.id)
            .eq("estado", "pendiente")
            .gt("expira_en", new Date().toISOString())
            .limit(1);

        if (errorPendientes) {
          console.error(errorPendientes);
          return Response.json({
            ok: false,
            error: {
              codigo: "ERROR_CONSULTA",
              mensaje: "No fue posible verificar los comandos pendientes."
            }
          }, { status: 500 });
        }

        // La parada sustituye órdenes pendientes; un inicio nunca bloquea detener.
        if (body.accion === "detener_riego") {
          const { error: stopError } = await ctx.supabaseAdmin
            .from("comandos_dispositivo")
            .update({ estado: "expirada" })
            .eq("dispositivo_id", dispositivo.id)
            .eq("estado", "pendiente");
          if (stopError) return Response.json({ ok: false, error: {
            codigo: "ERROR_PARADA", mensaje: "No fue posible sustituir las órdenes pendientes."
          } }, { status: 500 });
        }

        if (body.accion !== "detener_riego" && pendientes && pendientes.length > 0) {
          return Response.json({
            ok: false,
            error: {
              codigo: "COMANDO_PENDIENTE",
              mensaje: "El dispositivo ya tiene un comando pendiente."
            }
          }, { status: 409 });
        }

        const ahora = new Date();
        const expira = new Date(ahora.getTime() + 60000);

        const { data: comando, error } = await ctx.supabaseAdmin
          .from("comandos_dispositivo")
          .insert({
            dispositivo_id: dispositivo.id,
            accion: body.accion,
            estado: "pendiente",
            creado_en: ahora.toISOString(),
            expira_en: expira.toISOString()
          })
          .select("id, accion, estado, creado_en, expira_en")
          .single();

        if (error) {
          console.error(error);
          return Response.json({
            ok: false,
            error: {
              codigo: "ERROR_CREACION",
              mensaje: "No fue posible crear el comando."
            }
          }, { status: 500 });
        }

        return Response.json({
          ok: true,
          mensaje: "Comando creado. Esperando al dispositivo.",
          data: {
            dispositivo_id: body.dispositivo_id,
            comando
          }
        }, { status: 201 });

      } catch (error) {
        console.error(error);
        return Response.json({
          ok: false,
          error: {
            codigo: "ERROR_INTERNO",
            mensaje: "Ocurrió un error interno."
          }
        }, { status: 500 });
      }
    }
  )
};


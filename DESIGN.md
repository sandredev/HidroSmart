# Diseño de HidroSmart

## Dirección

Cuaderno de cultivo para un dispositivo que se consulta durante un ensayo. El papel cálido y las divisiones finas ordenan la jornada. El verde oliva identifica el cultivo y el azul identifica el agua y el control. El panel enlaza una fotografía editorial del cultivo con la humedad y el control de riego. La fotografía es ilustrativa.

## Sistema visual

- Superficie de papel en `#f5f3e9`, tinta en `#242b20` y bandas de cultivo en `#e9eddb`.
- Radley para títulos. National Park para lecturas, navegación y controles. Cifras tabulares donde se comparan medidas.
- Separar por alineación, divisiones y cambios de superficie. Usar esquinas discretas y evitar sombras decorativas.
- La navegación se mantiene en la cabecera. En móvil, los mandos de riego siguen a la última lectura, antes de la gráfica.
- En el gráfico, la serie, el rango y los eventos usan marcas distintas. Una tabla plegable ofrece los valores de la serie sin depender del gráfico.
- El historial da prioridad a la hora y al motivo. Los ajustes agrupan el rango de humedad, el límite por ciclo y la cantidad de plantas. HidroAI presenta las consultas como acciones y la respuesta como una nota.
- Los botones muestran el estado con texto. Las alertas no dependen del color.

## Fotografía ilustrativa

[cultivo-pepino.webp](public/cultivo-pepino.webp) se generó con ImageGen y se exportó a WebP para el panel.

> Editorial field photograph for a cucumber irrigation dashboard: overhead close-up of broad textured cucumber leaves and one small yellow blossom in dark moist soil, with a simple black drip line through the bed. Midmorning sidelight, olive and leaf greens, warm earthen tones, natural imperfections, strong tactile detail. Landscape 3:2, focal leaves toward the center-right, edge-to-edge crop, no text or graphics.

## Temas

- El selector de cabecera ofrece Automático, Claro y Oscuro; la preferencia se guarda en el navegador. Automático sigue los cambios del sistema.
- El tema oscuro conserva la identidad botánica: fondo verde profundo `#171e18`, superficies `#20291f`, bandas oliva `#283425` y texto cálido `#eeeede`.
- Los colores de texto y de relleno de botones usan roles separados para mantener contraste en ambos temas. Gráficos, formularios, alertas y chat comparten las variables semánticas.
- El tema se aplica antes del primer render para evitar un destello claro al cargar.

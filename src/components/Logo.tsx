import Image from "next/image";

/**
 * Marca KnowFlow.
 *
 * Tres presentaciones del mismo logotipo original:
 *  - `completo`   lockup vertical, para el login y material comercial
 *  - `horizontal` simbolo + palabra en linea, para la barra superior
 *  - `isotipo`    solo el simbolo, para avatares e iconos
 *
 * REGLA DE USO: el ala izquierda del simbolo es azul casi negro, asi que
 * sobre fondo abismo el logotipo se pierde. Va siempre sobre superficie
 * clara — o dentro de una placa blanca si el fondo tiene que ser oscuro.
 */
type Variante = "completo" | "horizontal" | "isotipo";

const FUENTES: Record<Variante, { src: string; ratio: number }> = {
  completo: { src: "/marca/knowflow-logo.png", ratio: 720 / 554 },
  horizontal: { src: "/marca/knowflow-horizontal.png", ratio: 560 / 139 },
  isotipo: { src: "/marca/knowflow-isotipo.png", ratio: 320 / 290 },
};

export default function Logo({
  variante = "horizontal",
  ancho = 140,
  priority = false,
  className = "",
}: {
  variante?: Variante;
  ancho?: number;
  priority?: boolean;
  className?: string;
}) {
  const { src, ratio } = FUENTES[variante];
  const alto = Math.round(ancho / ratio);
  return (
    <Image
      src={src}
      alt="KnowFlow"
      width={ancho}
      height={alto}
      priority={priority}
      className={className}
      style={{ width: ancho, height: alto }}
    />
  );
}

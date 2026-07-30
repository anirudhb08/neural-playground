import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cellToSourceRect, rasterize, type Placement } from "../lib/raster";

const SIZE = 300;
const STROKE = 22;

export type DrawCanvasHandle = { clear: () => void };

type Props = {
  onChange: (pixels: number[], placement: Placement | null) => void;
  /** Grid cell the learner is inspecting, shown back on the drawing. */
  highlight: { row: number; col: number } | null;
  placement: Placement | null;
  disabled?: boolean;
};

export const DrawCanvas = forwardRef<DrawCanvasHandle, Props>(
  function DrawCanvas({ onChange, highlight, placement, disabled }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const frame = useRef<number | null>(null);

    const context = () =>
      canvasRef.current?.getContext("2d", { willReadFrequently: true }) ?? null;

    const publish = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { pixels, placement: next } = rasterize(canvas);
      onChange(pixels, next);
    }, [onChange]);

    const clear = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = context();
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      publish();
    }, [publish]);

    useImperativeHandle(ref, () => ({ clear }), [clear]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = SIZE * dpr;
      canvas.height = SIZE * dpr;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.lineWidth = STROKE;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = inkColour();
    }, []);

    /**
     * Canvas 2D takes a resolved colour, not a var(), so the token has to be
     * read out of the document. Read again at every stroke: a reader who
     * switches theme mid-drawing gets the right ink from then on. Only the
     * alpha channel is ever rasterised, so the colour is purely what you see —
     * strokes already laid down keep the shade they were drawn in.
     */
    function inkColour() {
      if (typeof window === "undefined") return "#15201b";
      return (
        getComputedStyle(document.documentElement)
          .getPropertyValue("--color-ink")
          .trim() || "#15201b"
      );
    }

    function positionOf(event: ReactPointerEvent<HTMLCanvasElement>) {
      const rect = event.currentTarget.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * SIZE,
        y: ((event.clientY - rect.top) / rect.height) * SIZE,
      };
    }

    function start(event: ReactPointerEvent<HTMLCanvasElement>) {
      if (disabled) return;
      const ctx = context();
      if (!ctx) return;
      drawing.current = true;
      ctx.strokeStyle = inkColour();
      event.currentTarget.setPointerCapture(event.pointerId);
      const { x, y } = positionOf(event);
      ctx.beginPath();
      ctx.moveTo(x, y);
      // A tap with no drag should still leave a mark.
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    function move(event: ReactPointerEvent<HTMLCanvasElement>) {
      if (!drawing.current) return;
      const ctx = context();
      if (!ctx) return;
      const { x, y } = positionOf(event);
      ctx.lineTo(x, y);
      ctx.stroke();
      // Re-reading pixels is the expensive part; hold it to one per frame so
      // the grid keeps up with the stroke without stuttering.
      if (frame.current === null) {
        frame.current = requestAnimationFrame(() => {
          frame.current = null;
          publish();
        });
      }
    }

    function end() {
      if (!drawing.current) return;
      drawing.current = false;
      publish();
    }

    const marker =
      highlight && placement
        ? cellToSourceRect(placement, highlight.row, highlight.col)
        : null;
    const dpr = window.devicePixelRatio || 1;

    return (
      <div className="relative select-none">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          aria-label="Drawing area"
          className={`block aspect-square w-full touch-none border bg-paper-raised hairline ${
            disabled ? "cursor-not-allowed opacity-50" : "cursor-crosshair"
          }`}
        />
        {marker && (
          <span
            aria-hidden
            className="pointer-events-none absolute border-2 border-riso"
            style={{
              left: `${((marker.x / dpr) / SIZE) * 100}%`,
              top: `${((marker.y / dpr) / SIZE) * 100}%`,
              width: `${((marker.width / dpr) / SIZE) * 100}%`,
              height: `${((marker.height / dpr) / SIZE) * 100}%`,
            }}
          />
        )}
      </div>
    );
  },
);

import React, {
  useRef,
  useState,
} from 'react';

interface Position {
  x: number;
  y: number;
}

interface SpotlightCardProps
  extends React.PropsWithChildren {
  className?: string;

  spotlightColor?: `rgba(${number}, ${number}, ${number}, ${number})`;
}

const SpotlightCard: React.FC<
  SpotlightCardProps
> = ({
  children,
  className = '',
  spotlightColor =
    'rgba(49, 32, 255, 0.10)',
}) => {
  const divRef =
    useRef<HTMLDivElement>(
      null
    );

  const [
    isFocused,
    setIsFocused,
  ] = useState(false);

  const [
    position,
    setPosition,
  ] = useState<Position>({
    x: 0,
    y: 0,
  });

  const [
    opacity,
    setOpacity,
  ] = useState(0);

  const handleMouseMove:
    React.MouseEventHandler<HTMLDivElement> =
    (event) => {
      if (
        !divRef.current ||
        isFocused
      ) {
        return;
      }

      const rect =
        divRef.current.getBoundingClientRect();

      setPosition({
        x:
          event.clientX -
          rect.left,

        y:
          event.clientY -
          rect.top,
      });
    };

  const handleFocus = () => {
    setIsFocused(true);
    setOpacity(1);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setOpacity(0);
  };

  const handleMouseEnter =
    () => {
      setOpacity(1);
    };

  const handleMouseLeave =
    () => {
      setOpacity(0);
    };

  return (
    <div
      ref={divRef}
      onMouseMove={
        handleMouseMove
      }
      onFocus={
        handleFocus
      }
      onBlur={
        handleBlur
      }
      onMouseEnter={
        handleMouseEnter
      }
      onMouseLeave={
        handleMouseLeave
      }
      className={`
        relative
        overflow-hidden
        border
        border-zinc-200
        bg-zinc-50
        ${className}
      `}
    >
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          transition-opacity
          duration-300
          ease-out
        "
        style={{
          opacity,

          background: `
            radial-gradient(
              420px circle at
              ${position.x}px
              ${position.y}px,
              ${spotlightColor},
              transparent 65%
            )
          `,
        }}
      />

      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default SpotlightCard;
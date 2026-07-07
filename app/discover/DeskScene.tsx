'use client';

const shadow = 'rgba(96,53,16,.35)';
const shadowSoft = 'rgba(96,53,16,.3)';
const ink = '#1A1611';
const paper = '#FCFBF8';

/**
 * The desk world: wood surface, plank seams, window light, and props
 * (camera, spare lens, SD cards, sticky notes, pen, coffee). Desktop only —
 * on mobile the parent renders a wood-frame border instead.
 *
 * Positions are anchored to a 1180×760 stage from the design prototype and
 * absolutely placed inside the .desk-stage container.
 */
export function DeskScene({ steam = true, dim = 0.15 }: { steam?: boolean; dim?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block">
      {/* Wood + plank seams via .desk-wood on parent; window-light patch */}
      <div
        aria-hidden
        className="absolute"
        style={{
          top: '-140px',
          right: '-120px',
          width: '560px',
          height: '900px',
          transform: 'rotate(20deg)',
          background: 'var(--window-light)',
        }}
      />

      {/* Camera — top-left, cropped at edge, rotated -8deg */}
      <div
        aria-hidden
        className="absolute"
        style={{ top: '-26px', left: '-14px', transform: 'rotate(-8deg)' }}
      >
        <div
          style={{
            position: 'relative',
            width: '244px',
            height: '144px',
            background: '#241B12',
            borderRadius: '14px',
            boxShadow: `9px 11px 0 ${shadow}`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '14px',
              left: '18px',
              width: '116px',
              height: '24px',
              background: '#3A2C1D',
              borderRadius: '5px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '52px',
              left: '22px',
              width: '72px',
              height: '50px',
              background: '#0F0C08',
              borderRadius: '4px',
            }}
          />
          <div
            className="rec-dot"
            style={{
              position: 'absolute',
              top: '20px',
              right: '22px',
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              background: 'var(--rec)',
            }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            top: '32px',
            left: '230px',
            width: '50px',
            height: '82px',
            background: '#312517',
            borderRadius: '5px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '6px',
            left: '270px',
            width: '130px',
            height: '130px',
            borderRadius: '50%',
            background: '#4E3A26',
            boxShadow: `9px 11px 0 ${shadow}`,
          }}
        >
          <div style={{ position: 'absolute', inset: '18px', borderRadius: '50%', background: '#241B12' }} />
          <div style={{ position: 'absolute', inset: '44px', borderRadius: '50%', background: '#0F0C08' }} />
        </div>
      </div>

      {/* Spare lens */}
      <div
        aria-hidden
        className="absolute"
        style={{
          top: '238px',
          left: '100px',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: '#4E3A26',
          boxShadow: `7px 8px 0 ${shadow}`,
        }}
      >
        <div style={{ position: 'absolute', inset: '14px', borderRadius: '50%', background: '#241B12' }} />
        <div style={{ position: 'absolute', inset: '30px', borderRadius: '50%', background: '#0F0C08' }} />
      </div>

      {/* SD cards */}
      <div
        aria-hidden
        className="absolute"
        style={{
          top: '66px',
          right: '214px',
          width: '38px',
          height: '48px',
          background: '#2A2B33',
          borderRadius: '3px',
          transform: 'rotate(11deg)',
          boxShadow: `5px 6px 0 ${shadowSoft}`,
        }}
      >
        <div style={{ margin: '8px 5px', height: '22px', background: '#E5DAC2', borderRadius: '2px' }} />
      </div>
      <div
        aria-hidden
        className="absolute"
        style={{
          top: '84px',
          right: '170px',
          width: '38px',
          height: '48px',
          background: '#33343D',
          borderRadius: '3px',
          transform: 'rotate(-6deg)',
          boxShadow: `5px 6px 0 ${shadowSoft}`,
        }}
      >
        <div style={{ margin: '8px 5px', height: '22px', background: '#DCD0B4', borderRadius: '2px' }} />
      </div>

      {/* Sticky notes */}
      <div
        aria-hidden
        className="absolute"
        style={{
          left: '46px',
          bottom: '120px',
          width: '94px',
          height: '94px',
          background: 'var(--sticky-a)',
          transform: 'rotate(-5deg)',
          boxShadow: `6px 7px 0 ${shadowSoft}`,
          padding: '14px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ height: '3px', background: 'rgba(26,22,17,.35)', width: '78%' }} />
        <div style={{ height: '3px', background: 'rgba(26,22,17,.35)', width: '60%' }} />
        <div style={{ height: '3px', background: 'rgba(26,22,17,.35)', width: '70%' }} />
      </div>
      <div
        aria-hidden
        className="absolute"
        style={{
          left: '116px',
          bottom: '62px',
          width: '86px',
          height: '86px',
          background: 'var(--sticky-b)',
          transform: 'rotate(4deg)',
          boxShadow: `6px 7px 0 ${shadowSoft}`,
        }}
      />

      {/* Pen */}
      <div
        aria-hidden
        className="absolute"
        style={{
          right: '150px',
          bottom: '172px',
          width: '12px',
          height: '192px',
          borderRadius: '7px',
          background: '#241B12',
          transform: 'rotate(15deg)',
          boxShadow: `5px 6px 0 ${shadowSoft}`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '14px',
            left: '3px',
            width: '6px',
            height: '32px',
            background: '#D9A845',
            borderRadius: '3px',
          }}
        />
      </div>

      {/* Coffee cup with steam */}
      <div
        aria-hidden
        className="absolute"
        style={{ right: '60px', bottom: '52px', width: '130px', height: '130px' }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: '#8A5A2E',
            boxShadow: `7px 8px 0 ${shadowSoft}`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '14px',
            left: '14px',
            width: '102px',
            height: '102px',
            borderRadius: '50%',
            background: '#F6EFDF',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '30px',
            left: '30px',
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            background: '#3A1F0C',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '48px',
            right: '-11px',
            width: '22px',
            height: '22px',
            border: '9px solid #F6EFDF',
            borderRadius: '50%',
          }}
        />
        {steam && (
          <>
            <div
              className="steam"
              style={{
                position: 'absolute',
                top: '4px',
                left: '50px',
                width: '7px',
                height: '34px',
                borderRadius: '7px',
                background: 'rgba(252,251,248,.85)',
              }}
            />
            <div
              className="steam"
              style={{
                position: 'absolute',
                top: '10px',
                left: '68px',
                width: '6px',
                height: '28px',
                borderRadius: '7px',
                background: 'rgba(252,251,248,.7)',
                animationDelay: '1.1s',
              }}
            />
          </>
        )}
      </div>

      {/* Scene dim overlay under the notebook */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: 'var(--dim)', opacity: dim }}
      />
    </div>
  );
}

/** Mobile-only: a single sticky-note prop at a corner. Wood frame is
 *  provided by the parent's .desk-wood background bleeding through padding. */
export function DeskFrame() {
  return (
    <div className="pointer-events-none absolute inset-0 md:hidden" aria-hidden>
      <div
        className="absolute"
        style={{
          top: '4px',
          right: '4px',
          width: '44px',
          height: '44px',
          background: 'var(--sticky-a)',
          transform: 'rotate(9deg)',
          boxShadow: `3px 4px 0 ${shadowSoft}`,
        }}
      />
    </div>
  );
}

export { ink, paper };

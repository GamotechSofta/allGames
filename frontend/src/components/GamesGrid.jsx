import './GamesGrid.css'

export default function GamesGrid({ games = [], loading = false, error = '', onRetry, onPlay }) {
  const items = Array.isArray(games) ? games.filter(Boolean) : []

  return (
    <section className="games-section" aria-label="Games">
      <div className="games-section-head">
        <div className="games-section-titles">
          <h2 className="games-section-title">Games</h2>
          {!loading && items.length ? (
            <span className="games-section-count">{items.length}</span>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="games-state-box games-state-error" role="alert">
          <p>{error}</p>
          {typeof onRetry === 'function' ? (
            <button type="button" className="btn-game btn-purple games-retry-btn" onClick={onRetry}>
              Retry
            </button>
          ) : null}
        </div>
      ) : loading ? (
        <div className="games-grid" aria-busy="true" aria-label="Loading games">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="games-card games-card-skeleton">
              <div className="games-thumb-wrap games-skeleton-block" />
            </div>
          ))}
        </div>
      ) : !items.length ? (
        <div className="games-state-box">
          <p>No games are currently enabled.</p>
        </div>
      ) : (
        <div className="games-grid">
          {items.map((game) => {
            const isMaintenance = Boolean(game.maintenanceMode)
            const targetUrl = !isMaintenance ? game.launchUrl || game.demoUrl : ''
            const thumb = (
              <div className="games-thumb-wrap">
                {game.thumbnail ? (
                  <img
                    src={game.thumbnail}
                    alt={game.name}
                    className="games-thumb"
                    loading="lazy"
                  />
                ) : (
                  <div className="games-thumb-fallback" aria-hidden="true">
                    <span>{(game.name || 'G').slice(0, 2).toUpperCase()}</span>
                  </div>
                )}
                {isMaintenance ? (
                  <span className="games-status-badge is-maintenance">Maintenance</span>
                ) : null}
              </div>
            )

            return (
              <article
                key={game.id || game.slug || game.code}
                className={`games-card ${!targetUrl ? 'is-disabled' : ''}`}
              >
                {targetUrl ? (
                  typeof onPlay === 'function' ? (
                    <button
                      type="button"
                      className="games-card-link"
                      aria-label={`Play ${game.name}`}
                      title={game.name}
                      onClick={() => onPlay(game)}
                    >
                      {thumb}
                    </button>
                  ) : (
                    <a
                      href={targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="games-card-link"
                      aria-label={`Play ${game.name}`}
                      title={game.name}
                    >
                      {thumb}
                    </a>
                  )
                ) : (
                  <div className="games-card-link" aria-disabled="true" title={game.name}>
                    {thumb}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

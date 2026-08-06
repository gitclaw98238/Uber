interface LoadingSpinnerProps {
  label?: string;
  fullPage?: boolean;
}

const LoadingSpinner = ({ label = 'Loading…', fullPage = false }: LoadingSpinnerProps) => (
  <div className={fullPage ? 'loading-screen' : 'loading-inline'}>
    <div className="spinner" aria-hidden="true" />
    <p className="muted-text">{label}</p>
  </div>
);

export default LoadingSpinner;

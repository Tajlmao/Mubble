export default function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand ${small ? "brand-small" : ""}`}>
      <img
        src="/mubble-mark.svg"
        width="40"
        height="40"
        alt="Mubble orbital M logo"
      />
      <span>
        Mubble<span className="brand-dot">.</span>
      </span>
    </div>
  );
}

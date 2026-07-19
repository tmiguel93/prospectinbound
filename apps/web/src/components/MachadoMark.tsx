export function MachadoMark() {
  return (
    <svg
      aria-hidden="true"
      className="machado-mark"
      fill="none"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8.5 13.2c7.7-4.8 17-4.1 25.4 1.3l-3.5 7.2c-6.7-2.7-14.1-2.5-20.8.7l-3.1-6.1c-.5-1-.1-2.3 1-2.9Z"
        fill="url(#machado-blade)"
      />
      <path d="m27.4 20.2-13 20" stroke="#E2E8F0" strokeLinecap="round" strokeWidth="4.3" />
      <path d="m28.8 17.7-4.2 6.6" stroke="#F8FAFC" strokeLinecap="round" strokeWidth="2.4" />
      <defs>
        <linearGradient
          id="machado-blade"
          x1="8"
          x2="32.5"
          y1="10"
          y2="23"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#67E8F9" />
          <stop offset="1" stopColor="#0EA5E9" />
        </linearGradient>
      </defs>
    </svg>
  );
}

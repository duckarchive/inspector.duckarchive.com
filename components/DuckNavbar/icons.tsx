import { IconSvgProps } from "@/types";

const InspectorIcon: React.FC<IconSvgProps> = ({ size = 36, width, height, ...props }) => (
  <svg height={size || height} viewBox="0 0 500 500" width={size || width} {...props}>
    <circle cx="250" cy="250" r="240" fill="transparent" stroke="black" strokeWidth="20" />
    <path
      d="M413.62 260L290.445 442H209.017L85.8427 260L413.62 260Z"
      fill="#F97316"
      stroke="black"
      strokeWidth="20"
    />
  </svg>
);

const MapIcon: React.FC<IconSvgProps> = ({ size = 36, width, height, ...props }) => (
  <svg
    height={size || height}
    width={size || width}
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle cx="18" cy="18" r="15.5" stroke="#AEE5FF" />
    <path
      d="M18 2.5C19.9177 2.5 21.7888 4.06788 23.21 6.91016C24.616 9.7225 25.5 13.6427 25.5 18C25.5 22.3573 24.616 26.2775 23.21 29.0898C21.7888 31.9321 19.9177 33.5 18 33.5C16.0823 33.5 14.2112 31.9321 12.79 29.0898C11.384 26.2775 10.5 22.3573 10.5 18C10.5 13.6427 11.384 9.7225 12.79 6.91016C14.2112 4.06788 16.0823 2.5 18 2.5Z"
      stroke="#AEE5FF"
    />
    <path
      d="M18 2.5C21.121 2.5 23.9844 4.18569 26.085 6.98633C28.1856 9.7872 29.5 13.6794 29.5 18C29.5 22.3206 28.1856 26.2128 26.085 29.0137C23.9844 31.8143 21.121 33.5 18 33.5C14.879 33.5 12.0156 31.8143 9.91504 29.0137C7.81439 26.2128 6.5 22.3206 6.5 18C6.5 13.6794 7.81439 9.7872 9.91504 6.98633C12.0156 4.18569 14.879 2.5 18 2.5Z"
      stroke="#AEE5FF"
    />
    <path
      d="M18 2.5C18.2664 2.5 18.6637 2.72796 19.127 3.51172C19.5704 4.262 19.9871 5.38117 20.3438 6.80762C21.0551 9.65299 21.5 13.6104 21.5 18C21.5 22.3896 21.0551 26.347 20.3438 29.1924C19.9871 30.6188 19.5704 31.738 19.127 32.4883C18.6637 33.272 18.2664 33.5 18 33.5C17.7336 33.5 17.3363 33.272 16.873 32.4883C16.4296 31.738 16.0129 30.6188 15.6562 29.1924C14.9449 26.347 14.5 22.3896 14.5 18C14.5 13.6104 14.9449 9.65299 15.6562 6.80762C16.0129 5.38117 16.4296 4.262 16.873 3.51172C17.3363 2.72796 17.7336 2.5 18 2.5Z"
      stroke="#AEE5FF"
    />
  </svg>
);

const KeyIcon: React.FC<IconSvgProps> = ({ size = 36, width, height, ...props }) => (
  <svg
    height={size || height}
    width={size || width}
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M18 32L32 4L4 4" stroke="black" stroke-width="2" stroke-dasharray="2 2" />
  </svg>
);

const EggIcon: React.FC<IconSvgProps> = ({ size = 36, width, height, ...props }) => (
  <svg
    height={size || height}
    width={size || width}
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M18 26.4706C22.5882 26.4706 26.3077 22.6782 26.3077 18C26.3077 13.3218 22.5882 9.52939 18 9.52939C13.4118 9.52939 9.69229 13.3218 9.69229 18C9.69229 22.6782 13.4118 26.4706 18 26.4706Z"
      fill="white"
      stroke="black"
      stroke-width="0.5"
    />
    <path
      d="M23.6638 18.3529L19.4 24.7765H16.5814L12.3176 18.3529H23.6638Z"
      fill="#F97316"
      stroke="black"
      stroke-width="0.5"
    />
    <path
      d="M18 34C24.6274 34 30 28.3114 30 21.2941L26 17.0588L22 21.2941L18 17.0588L14 21.2941L10 17.0588L6 21.2941C6 28.3114 11.3726 34 18 34Z"
      fill="white"
      stroke="black"
      stroke-linecap="round"
    />
    <path
      d="M18 2C11.3726 2 6 12.4637 6 18.9412L10 15.0317L14 18.9412L18 15.0317L22 18.9412L26 15.0317L30 18.9412C30 12.4637 24.6274 2 18 2Z"
      fill="white"
      stroke="black"
      stroke-linecap="round"
    />
  </svg>
);

const LakeIcon: React.FC<IconSvgProps> = ({ size = 36, width, height, ...props }) => (
  <svg
    height={size || height}
    width={size || width}
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect width="36" height="36" fill="none" />
    <path d="M6.57144 18L6.57144 28.6667" stroke="#006A20" stroke-width="2" />
    <path
      d="M17.2929 34.7071C17.6834 35.0976 18.3166 35.0976 18.7071 34.7071L25.0711 28.3431C25.4616 27.9526 25.4616 27.3195 25.0711 26.9289C24.6805 26.5384 24.0474 26.5384 23.6569 26.9289L18 32.5858L12.3431 26.9289C11.9526 26.5384 11.3195 26.5384 10.9289 26.9289C10.5384 27.3195 10.5384 27.9526 10.9289 28.3431L17.2929 34.7071ZM17 18L17 34H19L19 18H17Z"
      fill="#006A20"
    />
    <path d="M29.4286 18V28.6667" stroke="#006A20" stroke-width="2" />
    <rect x="2.5" y="2.5" width="8.14286" height="16.0667" rx="1.5" fill="#F97316" stroke="black" />
    <rect x="13.9286" y="2.5" width="8.14286" height="16.0667" rx="1.5" fill="#F97316" stroke="black" />
    <rect x="25.3571" y="2.5" width="8.14286" height="16.0667" rx="1.5" fill="#F97316" stroke="black" />
  </svg>
);

const FootIcon: React.FC<IconSvgProps> = ({ size = 36, width, height, ...props }) => (
  <svg
    height={size || height}
    width={size || width}
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M19.7899 33.1267C18.8581 34.2911 17.1419 34.2911 16.2101 33.1267L7.3258 22.0232C7.15472 21.8094 7.02018 21.5665 6.92806 21.3051L2.14419 7.73421C1.64249 6.31099 2.50063 4.76184 3.93405 4.50308L17.6023 2.03564C17.8655 1.98812 18.1345 1.98812 18.3977 2.03564L32.0659 4.50308C33.4994 4.76185 34.3575 6.311 33.8558 7.73422L29.0719 21.3051C28.9798 21.5665 28.8453 21.8094 28.6742 22.0232L19.7899 33.1267Z"
      fill="#F97316"
    />
    <path
      d="M18 2.16625L18 33.7442M29.0719 21.3051L33.8558 7.73422C34.3575 6.311 33.4994 4.76185 32.0659 4.50308L18.3977 2.03564C18.1345 1.98812 17.8655 1.98812 17.6023 2.03564L3.93405 4.50308C2.50063 4.76184 1.64249 6.31099 2.14419 7.73421L6.92806 21.3051C7.02018 21.5665 7.15472 21.8094 7.3258 22.0232L16.2101 33.1267C17.1419 34.2911 18.8581 34.2911 19.7899 33.1267L28.6742 22.0232C28.8453 21.8094 28.9798 21.5665 29.0719 21.3051Z"
      stroke="black"
    />
  </svg>
);

const SpravnaIcon: React.FC<IconSvgProps> = ({ size = 36, width, height, ...props }) => (
  <svg
    height={size || height}
    width={size || width}
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M33.5 21.3164C33.5 20.2927 32.93 19.2084 31.665 18.3447L9.35547 3.11426C8.7702 2.71469 7.97627 2.50001 7.1582 2.5C6.34012 2.5 5.54623 2.71468 4.96094 3.11426L3.3086 4.24219C2.72795 4.63862 2.5 5.11021 2.5 5.52148C2.50001 5.93275 2.72795 6.40435 3.30859 6.80078L30.2949 25.2236L31.665 24.2881C32.93 23.4244 33.4999 22.3401 33.5 21.3164ZM11.0078 24.5498C10.4225 24.1502 9.62863 23.9355 8.81055 23.9355C7.99262 23.9356 7.19949 24.1503 6.61426 24.5498L4.96094 25.6777C4.3804 26.0741 4.15237 26.5458 4.15234 26.957C4.15234 27.3683 4.38041 27.8399 4.96094 28.2363L10.7451 32.1855C12.0149 33.0524 13.7057 33.5 15.4209 33.5C17.1361 33.5 18.8269 33.0523 20.0967 32.1855L21.1445 31.4707L11.0078 24.5498ZM11.834 14.96C11.2487 14.5604 10.4548 14.3457 9.63672 14.3457C8.81884 14.3457 8.02563 14.5605 7.44043 14.96L5.78711 16.0879C5.20665 16.4842 4.97862 16.956 4.97852 17.3672C4.97852 17.7784 5.20671 18.2501 5.78711 18.6465L22.8584 30.3008L28.582 26.3936L11.834 14.96Z"
      fill="white"
      stroke="black"
    />
  </svg>
);

export const ICONS: Record<string, React.ReactNode> = {
  inspector: <InspectorIcon className="shrink-0" />,
  map: <MapIcon className="shrink-0" />,
  key: <KeyIcon className="shrink-0" />,
  egg: <EggIcon className="shrink-0" />,
  lake: <LakeIcon className="shrink-0" />,
  foot: <FootIcon className="shrink-0" />,
  spravna: <SpravnaIcon className="shrink-0" />,
};
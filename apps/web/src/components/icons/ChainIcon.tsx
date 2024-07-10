import { ComponentProps } from "react";
import {
  base,
  baseSepolia,
  blast,
  blastSepolia,
  mainnet,
  polygon,
  polygonAmoy,
  sepolia,
} from "viem/chains";

type ChainIconProps = ComponentProps<"svg"> & {
  chainId: number;
};

export default function ChainIcon(props: ChainIconProps) {
  const { chainId, ...rest } = props;
  switch (chainId) {
    case mainnet.id:
    case sepolia.id:
      return <EthereumIcon width={14} height={14} {...rest} />;
    case polygon.id:
    case polygonAmoy.id:
      return <PolygonIcon width={14} height={14} {...rest} />;
    case blast.id:
    case blastSepolia.id:
      return <BlastIcon width={14} height={14} {...rest} />;
    case base.id:
    case baseSepolia.id:
      return <BaseIcon width={14} height={14} {...rest} />;
    default:
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={16}
          height={16}
          viewBox="0 0 215 215"
          fill="none"
          {...rest}
        ></svg>
      );
  }
}

function BlastIcon(props: Omit<ChainIconProps, "chainId">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 215 215"
      fill="none"
      {...props}
    >
      <path
        fill="#FCFC03"
        d="m161 106.4 29.3-14.6 10.1-31-20.2-14.7H45.7L14.6 69.2h158.1l-8.4 26h-63.4l-6.1 19h63.4l-17.8 54.7 29.7-14.7 10.6-32.8-19.9-14.6.2-.4Z"
      />
      <path
        fill="#FCFC03"
        d="m59.3 145.4 18.3-57-20.3-15.2-30.5 95.7h113.6l7.6-23.5H59.3Z"
      />
    </svg>
  );
}

function EthereumIcon(props: Omit<ChainIconProps, "chainId">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlSpace="preserve"
      fillRule="evenodd"
      clipRule="evenodd"
      imageRendering="optimizeQuality"
      shapeRendering="geometricPrecision"
      textRendering="geometricPrecision"
      viewBox="0 0 784.37 1277.39"
      {...props}
    >
      <g fillRule="nonzero">
        <path
          fill="#343434"
          d="m392.07 0-8.57 29.11v844.63l8.57 8.55 392.06-231.75z"
        />
        <path fill="#8C8C8C" d="M392.07 0 0 650.54l392.07 231.75V472.33z" />
        <path
          fill="#3C3C3B"
          d="m392.07 956.52-4.83 5.89v300.87l4.83 14.1 392.3-552.49z"
        />
        <path fill="#8C8C8C" d="M392.07 1277.38V956.52L0 724.89z" />
        <path fill="#141414" d="m392.07 882.29 392.06-231.75-392.06-178.21z" />
        <path fill="#393939" d="m0 650.54 392.07 231.75V472.33z" />
      </g>
    </svg>
  );
}

function PolygonIcon(props: Omit<ChainIconProps, "chainId">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 179 161"
      {...props}
    >
      <path
        fill="#6C00F6"
        d="m66.766 54.741-16.69-9.661L0 74.061v57.958L50.075 161l50.078-28.981v-90.16l27.818-16.099 27.822 16.099v32.202L127.971 90.16l-16.691-9.658v25.757l16.691 9.661 50.076-28.981V28.981L127.971 0 77.896 28.981v90.16l-27.82 16.099-27.82-16.099V86.939l27.82-16.099 16.69 9.658V54.741Z"
      />
    </svg>
  );
}

function BaseIcon(props: Omit<ChainIconProps, "chainId">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 146 146"
      {...props}
    >
      <circle cx={73} cy={73} r={73} fill="#0052FF" />
      <path
        fill="#fff"
        d="M73.323 123.729c28.294 0 51.23-22.897 51.23-51.141 0-28.245-22.936-51.142-51.23-51.142-26.843 0-48.865 20.61-51.052 46.843h67.715v8.597H22.27c2.187 26.233 24.209 46.843 51.052 46.843Z"
      />
    </svg>
  );
}

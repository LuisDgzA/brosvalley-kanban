import { Avatar as AntdAvatar, type AvatarProps } from "antd";

type Props = AvatarProps & {
  name: string;
};

const CustomAvatar = ({ name, style, ...rest }: Props) => {
  return (
    <AntdAvatar
      alt="User"
      size="small"
      style={{
        background:
          "linear-gradient(135deg, rgba(15,118,110,0.95), rgba(29,78,216,0.82))",
        display: "flex",
        alignItems: "center",
        border: "none",
        boxShadow: "0 8px 18px rgba(15, 23, 42, 0.18)",
        ...style,
      }}
      {...rest}
    >
      {name}
    </AntdAvatar>
  );
};

export default CustomAvatar;

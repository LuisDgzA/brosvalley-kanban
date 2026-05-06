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
        backgroundColor: "#87d068",
        display: "flex",
        alignItems: "center",
        border: "none",
        ...style,
      }}
      {...rest}
    >
      {name}
    </AntdAvatar>
  );
};

export default CustomAvatar;

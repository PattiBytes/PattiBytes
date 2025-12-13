/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { JSX } from 'react';

type Props = React.HTMLAttributes<HTMLElement> & {
  as?: keyof JSX.IntrinsicElements;
  pressed?: boolean;
  className?: string;
};

export default function Pressable({
  as = 'div',
  pressed,
  className,
  ...rest
}: Props) {
  const Tag: any = as;
  return (
    <Tag
      {...rest}
      className={`pb-pressable ${className ?? ''}`}
      data-pressed={pressed ? 'true' : 'false'}
    />
  );
}

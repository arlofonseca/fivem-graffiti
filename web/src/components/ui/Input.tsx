import { twMerge } from 'tailwind-merge';

export interface InputInterface {
  className?: string;
  id?: string;
  onChange?: (value: string) => void;
  defaultValue?: number;
  style?: React.CSSProperties;
  title?: string;
}

const Input: ({ className, defaultValue, id, onChange, style, title }: InputInterface) => JSX.Element = ({
  className,
  defaultValue,
  id,
  onChange,
  style,
  title,
}: InputInterface) => {
  const func: (value: string) => void = (value: string): void => {
    if (!onChange) return console.log('Something went wrong.');
    onChange(value);
  };

  return (
    <>
      <div
        id={id}
        style={style}
        className={twMerge(
          'flex w-full flex-col items-start justify-center',
          className,
          title ? 'h-[5.5dvh]' : 'h-[3dvh]'
        )}
      >
        {title && <p className="text-sm font-semibold opacity-80">{title}</p>}
        <input
          type="text"
          defaultValue={defaultValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
            const value: string = e.currentTarget.value;
            func(value);
          }}
          className=" h-full w-full rounded-[6px] border-[1px] border-primaryBorder !bg-[#151517] p-1 text-sm !outline-none focus:border-secondaryBorder"
        />
      </div>
    </>
  );
};

export default Input;

import { twMerge } from 'tailwind-merge';

export interface InputInterface {
  className?: string;
  id?: string;
  onChange?: (value: string) => void;
  defaultValue?: number;
  style?: React.CSSProperties;
  title?: string;
}

const Input = ({ className, defaultValue, id, onChange, style, title }: InputInterface) => {
  const onChaneFunc = (value: string) => {
    if (!onChange) return console.log('[DEBUG] (Input:onChaneFunc) onChange prop is null, returning.');
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
          placeholder="..."
          onChange={(e) => {
            const value = e.currentTarget.value;
            onChaneFunc(value);
          }}
          className=" h-full w-full rounded-[6px] border-[1px] border-primaryBorder !bg-[#151517] p-1 text-sm !outline-none focus:border-secondaryBorder"
        />
      </div>
    </>
  );
};

export default Input;

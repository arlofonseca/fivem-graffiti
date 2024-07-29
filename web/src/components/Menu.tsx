import { Select, SelectItem } from '@nextui-org/select';
import { Slider } from '@nextui-org/slider';
import { RgbaColorPicker } from 'react-colorful';
import { FaSprayCan } from 'react-icons/fa';
import Input from './modal/Input';

const Menu = () => {
  return (
    <>
      <div className="absolute bottom-0 right-0 m-4 flex h-[50dvh] w-[23dvw]  flex-col items-center justify-center gap-2 rounded-[2px] border-[1px] border-primaryBorder bg-[#333439f6]">
        <div className="mt-2 flex h-[4.5dvh] w-[95%] items-center gap-2 rounded-[6px] border border-primaryBorder bg-[#1b1c20]">
          <div className="ml-3 flex h-[75%] w-[2dvw] items-center justify-center rounded-[4px] border border-primaryBorder bg-[#333439f6]">
            <FaSprayCan size={15} />
          </div>
          <p className="text-[15px] font-semibold opacity-80">Create Graffiti</p>
        </div>

        <div className="mb-2 flex h-full w-[95%] flex-col items-center justify-around rounded-[6px] border border-primaryBorder p-2">
          <Input title="Text" />
          <Select
            classNames={{
              popoverContent: '!bg-[#151517] rounded-[6px] border border-primaryBorder',
              trigger: '!bg-[#151517] rounded-[6px] border border-primaryBorder',
              label: '!font-semibold opacity-80',
            }}
            listboxProps={{
              itemClasses: {
                base: ' rounded-[6px] dark opacity-80',
              },
            }}
            variant="flat"
            labelPlacement="outside"
            label="Font"
            radius="none"
          >
            <SelectItem key={'fontOne'}>JetBrains Mono</SelectItem>
            <SelectItem key={'fontTwo'}>Times New Roman</SelectItem>
          </Select>

          <Slider
            label="Depth Correction"
            step={0.01}
            maxValue={1}
            minValue={0}
            defaultValue={0.4}
            className="max-w-md"
            color="primary"
            size="md"
            classNames={{
              labelWrapper: 'font-semibold opacity-80',
            }}
          />
          <div className="custom-layout flex  w-full flex-col justify-center gap-1">
            <p className="text-sm font-semibold opacity-80">Color</p>
            <RgbaColorPicker className="!w-full rounded-[6px] border border-primaryBorder" />
          </div>
        </div>
      </div>
    </>
  );
};

export default Menu;

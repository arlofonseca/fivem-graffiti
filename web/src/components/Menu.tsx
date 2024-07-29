import { RgbaColorPicker } from 'react-colorful';
import { FaSprayCan } from 'react-icons/fa';
import Input from './ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';

const Menu = () => {
  return (
    <>
      <div className="flex w-[100dvw] h-[100dvh] items-end justify-end">
        <div className="m-4 flex h-[50dvh] w-[23dvw]  flex-col items-center justify-center gap-2 rounded-[2px] border-[1px] border-primaryBorder bg-[#333439f6]">
          <div className="mt-2 flex h-[4.5dvh] w-[95%] items-center gap-2 rounded-[6px] border border-primaryBorder bg-[#1b1c20]">
            <div className="ml-3 flex h-[75%] w-[2dvw] items-center justify-center rounded-[4px] border border-primaryBorder bg-[#333439f6]">
              <FaSprayCan size={15} />
            </div>
            <p className="text-[15px] font-semibold opacity-80">Create Graffiti</p>
          </div>
          <div className="mb-2 flex h-full w-[95%] flex-col items-center justify-around rounded-[6px] border border-primaryBorder p-2">
            <Input title="Text" />
            <div className="w-full flex flex-col gap-1">
              <p className="text-sm font-semibold opacity-80">Font</p>
              <Select>
                <SelectTrigger className="w-full  *:!text-opacity-80 font-semibold rounded-[6px] bg-[#151517]">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-red absolute">
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full flex flex-col gap-1">
              <p className="text-sm font-semibold opacity-80">Depth Correction</p>
              <Slider defaultValue={[33]} max={100} step={1} />
            </div>

            <div className="custom-layout flex w-full flex-col justify-center gap-1">
              <p className="text-sm font-semibold opacity-80">Color</p>
              <RgbaColorPicker className="!w-full rounded-[6px] border border-primaryBorder" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Menu;

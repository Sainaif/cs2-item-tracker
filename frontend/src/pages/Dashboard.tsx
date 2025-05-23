import BarChart from '@/components/BarChart'
import ButtonConfirm from '@/components/ButtonConfirm';
import Card from '@/components/Card'
import { DatePicker } from '@/components/DatePicker';
import EditTable from '@/components/EditTable';
import Input from '@/components/Input';
import ModalItem from '@/components/ModalItem';
import Table from '@/components/Table';
import useItemStore, { Item } from '@/store/useItemStore';
import axios from 'axios';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { FiPlusCircle, FiX } from "react-icons/fi";
import { toast } from 'sonner';

const itemRegex = /^[a-zA-Z0-9! |★壱()-™]+$/;
const priceRegex = /^-?\d+(\.\d{1,2})?$/;
const itemUrlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/;

function Dashboard() {
  const { fetchStats, stats, refreshData, fetchAllItems, allItems } = useItemStore();
  
  const [open, setOpen] = useState(false);
  const [value, setValues] = useState<Partial<Item>>({});
  const [errors, setErrors] = useState({
    imageUrl: '',
    itemName: '',
    buyPrice: '',
    buyDate: '',
    soldPrice: '',
    soldDate: '',
    main: ''
  });
  type ErrorKey = keyof typeof errors;

  const recentSales = useMemo(() => {
    const soldItems = allItems.filter(item => 
      item.soldDate !== null && 
      item.soldPrice !== null
    );
    
    const sortedItems = soldItems.sort((a, b) => 
      (b.soldDate || 0) - (a.soldDate || 0)
    );
    
    return sortedItems.slice(0, 5);
  }, [allItems]);

  useEffect(() => {
    fetchAllItems();
    fetchStats();
  }, [fetchAllItems, fetchStats]);
  
  const openModal = () => {
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setValues({
      itemName: '',
      buyPrice: undefined,
      buyDate: undefined,
      soldPrice: null,
      soldDate: null,
      imageUrl: null
    });
    setErrors({
      imageUrl: '',
      itemName: '',
      buyPrice: '',
      buyDate: '',
      soldPrice: '',
      soldDate: '',
      main: ''
    });
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (validateData(value)){
      await axios.post('/api/items/create', value)
      .then( async (response) => {
        toast.success("Item added");
        closeModal();
        if (response.data && response.data.item) {
          useItemStore.getState().addItem(response.data.item);
        } else {
          await refreshData();
        }
      })
      .catch( error => {
        setErrors( prev => ({
          ...prev,
          main: error.response.data.message || 'Failed to add item'
        }));
      });
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setErrors( prev => ({
      ...prev,
      main: ''
    }));

    setValues( prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name as ErrorKey]) {
      setErrors( prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateData = (data: Partial<Item>) => {
    const errors = {
      imageUrl: '',
      itemName: '',
      buyPrice: '',
      buyDate: '',
      soldPrice: '',
      soldDate: '',
      main: ''
    };
    let isValid = true;
    
    if (!data.itemName || data.itemName.trim() === '') {
      errors.itemName = 'Item name is required';
      isValid = false;
    } else if (!itemRegex.test(data.itemName)) {
      errors.itemName = 'Item name contains invalid characters';
      isValid = false;
    };
    
    if (data.buyPrice === undefined || data.buyPrice === null || data.buyPrice < 0) {
      errors.buyPrice = 'Buy price must be 0 or greater';
      isValid = false;
    } else if (!priceRegex.test(String(data.buyPrice))) {
      errors.buyPrice = 'Buy price must be a valid number with up to 2 decimal places';
      isValid = false;
    };

    if (!data.buyDate){
      errors.buyDate = "Buy date must be valid."
      isValid = false;
    };
    
    if (data.imageUrl && data.imageUrl.trim() !== '' && !itemUrlRegex.test(data.imageUrl)) {
      errors.imageUrl = 'Please enter a valid image URL';
      isValid = false;
    };

    if (data.soldDate && (!data.soldPrice || Number(data.soldPrice) === 0)) {
      data.soldPrice = 0;
    };

    if (data.soldPrice && Number(data.soldPrice) > 0 && !data.soldDate) {
      data.soldDate = Date.now();
    };
    
    if (data.soldPrice !== undefined && data.soldPrice !== null && String(data.soldPrice) !== '') {
      if (Number(data.soldPrice) < 0) {
        errors.soldPrice = 'Sold price must be 0 or greater';
        isValid = false;
      } else if (!priceRegex.test(String(data.soldPrice))) {
        errors.soldPrice = 'Sold price must be a valid number with up to 2 decimal places';
        isValid = false;
      }
    };
    
    if (data.buyDate && data.soldDate && data.buyDate > data.soldDate) {
      errors.soldDate = 'Sold date must be after buy date';
      isValid = false;
    };

    setErrors(errors);
    return isValid;
  };

  const handleBuyDateChange = (date: Date | undefined) => {
    setValues(prev => ({
      ...prev,
      buyDate: date ? date.getTime() : Date.now()
    }));
  
    if (errors.buyDate) {
      setErrors(prev => ({
        ...prev,
        buyDate: ''
      }));
    }
  };

  const handleSoldDateChange = (date: Date | undefined) => {
    setValues(prev => ({
      ...prev,
      soldDate: date ? date.getTime() : null
    }));
  
    if (errors.soldDate) {
      setErrors(prev => ({
        ...prev,
        soldDate: ''
      }));
    }
  };

  return (
    <>
    <div className="flex flex-col gap-5 mx-4 my-3 items-center">
      <div className='text-7xl mb-5 text-green-300 cursor-pointer hover:text-green-100' onClick={openModal}>
      <FiPlusCircle />
      </div>
      { stats ? (
        <>
          <div className='flex flex-row flex-wrap gap-4.5 xl:justify-between max-w-[1275px] xl:w-full justify-center'>
            <Card
              icon='dollar'
              title='Total Revenue'
              amount={`${(parseFloat(stats.averagePrices.sell) * allItems.length).toFixed(2) }c`}
              subtitle={`Average ROI: ${stats.averageROI}`}
            />
            <Card
              icon='chart'
              title='Avg Price Comparison'
              amount={`${stats.averagePrices.buy}c → ${stats.averagePrices.sell}c`}
              subtitle='Purchase vs. Selling'
            />
            <Card
              icon='card'
              title='Highest Profit Item'
              amount={ stats?.highestProfitItem ? `${Number(stats.highestProfitItem.profit).toFixed(2)}c` : '0c'}
              subtitle={stats?.highestProfitItem ? stats.highestProfitItem.itemName : 'No items sold yet'}
            />
            <Card
              icon='monitor'
              title='Items Purchased This Month'
              amount={`${stats.itemsPurchasedThisMonth}`}
              subtitle='Purchased current month'
            />
          </div>
          <div className='flex flex-row flex-wrap gap-5 justify-center'>
            <BarChart data={stats?.yearlyData || {}} title="Monthly Profit/Loss"></BarChart>
            <Table items={recentSales} title="Recent sales"></Table>
          </div>
          <div className='flex'>
            <EditTable/>
          </div>
        </>
      ): (
        <div className='text-beige-100 text-3xl text-center my-10'>Loading statistics...</div>
      )}
    </div>
    <ModalItem open={open} onClose={closeModal}>
      <div className="grid grid-flow-row grid-cols-2 justify-center items-center mx-5 my-25 gap-9">
        <div className="col-span-2">
          { errors.main ? (
            <div className='text-red text-4xl pb-15 text-center'>{errors.main}</div>
          ): ''}
          <div className="flex flex-col justify-center items-center mb-5">
            <Input
            placeholder="Choose item or write"
            className={`font-bold sm:text-2xl ${ errors.itemName ? "outline-red text-red": ""}`}
            value={value.itemName || ''}
            onChange={handleChange}
            name="itemName"
            />
            <div className="text-beige-100 leading-15">Search for item you would like to add or write your own.</div>
            { errors.itemName ? (
              <div className="text-red text-2xl w-72">{errors.itemName}</div>
            ): ""}
          </div>
          <div className="flex col-span-2 flex-col justify-center items-center mb-5">
            <Input
            placeholder="Write buy price"
            className={`font-bold sm:text-2xl ${ errors.buyPrice ? "outline-red text-red": ""}`}
            value={value.buyPrice || ""}
            onChange={handleChange}
            name="buyPrice"
            type="number"
            />
            <div className="text-beige-100 leading-15">Enter price you bought item for.</div>
            { errors.buyPrice ? (
              <div className="text-red text-2xl">{errors.buyPrice}</div>
            ): ""}
          </div>
          <div className="flex col-span-2 flex-col justify-center items-center mb-5">
            <DatePicker 
            date={value.buyDate ? new Date(value.buyDate) : undefined}
            onSelect={handleBuyDateChange}
            placeholder="Enter item buy date"
            className={`${ errors.buyDate ? "outline-red text-red": ""}`}
            />
            <div className="text-beige-100 leading-15">Pick date you bought item.</div>
            { errors.buyDate ? (
              <div className="text-red text-2xl w-72">{errors.buyDate}</div>
            ): ""}
          </div>
        </div>
        <div className="col-span-2">
          <div className="flex flex-col justify-center items-center mb-5">
            <Input
            placeholder="Enter item sold price"
            className={`font-bold sm:text-2xl ${ errors.soldPrice ? "outline-red text-red": ""}`}
            value={value.soldPrice || ""}
            onChange={handleChange}
            name="soldPrice"
            type="number"
            />
            <div className="text-beige-100 leading-15">Enter price you sold item for.
            If not sold yet, leave.</div>
            { errors.soldPrice ? (
              <div className="text-red text-2xl w-72">{errors.soldPrice}</div>
            ): ""}
          </div>
          <div className="flex flex-col justify-center items-center mb-5">
            <DatePicker 
            date={value.soldDate ? new Date(value.soldDate) : undefined}
            onSelect={handleSoldDateChange}
            placeholder="Enter item sold date"
            className={`${ errors.soldDate ? "outline-red text-red": ""}`}
            />
            <div className="text-beige-100 leading-15">Pick date you sold item
            If not sold yet, leave.</div>
            { errors.soldDate ? (
              <div className="text-red text-2xl w-72">{errors.soldDate}</div>
            ): ""}
          </div>
          <div className="flex col-span-2 flex-col justify-center items-center mb-5">
            <Input
            placeholder="write image url"
            className={`font-bold sm:text-2xl ${ errors.imageUrl ? "outline-red text-red": ""}`}
            value={value.imageUrl || ''}
            onChange={handleChange}
            name="imageUrl"
            />
            <div className="text-beige-100 leading-15">Enter image url.</div>
            { errors.imageUrl ? (
              <div className="text-red text-2xl w-72">{errors.imageUrl}</div>
            ): ""}
          </div>
        </div>
        <div className="col-span-2 flex flex-row justify-center items-center mb-5 gap-5 sm:mx-20">
          <ButtonConfirm
          onClick={handleSave}
          className='max-w-[285px]'
          >Add</ButtonConfirm>
          <button onClick={closeModal} className="flex items-center justify-center outline-2 outline-green-500 bg-midnight h-12 text-beige-200 rounded-lg text-3xl cursor-pointer w-[60%] max-w-[180px]">
            <FiX />
          </button>
        </div>
      </div>
    </ModalItem>
    </>
  )
}

export default Dashboard
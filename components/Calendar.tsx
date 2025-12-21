import React from 'react';
// FIX: Changed HolidayRequest to LeaveRequest to match the correct type definition.
import { LeaveRequest, RequestStatus } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface CalendarProps {
  requests: LeaveRequest[];
  displayedDate: Date;
  setDisplayedDate: (date: Date) => void;
  startDate: Date | null;
  endDate: Date | null;
  onDateClick: (date: Date) => void;
}

const statusStyles: Record<RequestStatus, { bg: string; text: string }> = {
  [RequestStatus.PENDING]: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  [RequestStatus.APPROVED]: { bg: 'bg-green-100', text: 'text-green-800' },
  [RequestStatus.REJECTED]: { bg: 'bg-red-100', text: 'text-red-800' },
  [RequestStatus.CANCELLED]: { bg: 'bg-gray-100', text: 'text-gray-800' },
};

const Calendar = ({ requests, displayedDate, setDisplayedDate, startDate, endDate, onDateClick }: CalendarProps) => {
  const year = displayedDate.getFullYear();
  const month = displayedDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDayOfWeek = firstDayOfMonth.getDay(); 

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handlePrevMonth = () => {
    setDisplayedDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setDisplayedDate(new Date(year, month + 1, 1));
  };

  const getDayStatus = (dayDate: Date) => {
    for (const req of requests) {
      const reqStart = new Date(req.startDate);
      reqStart.setHours(0,0,0,0);
      const reqEnd = new Date(req.endDate);
      reqEnd.setHours(0,0,0,0);

      if (dayDate >= reqStart && dayDate <= reqEnd) {
        return req.status;
      }
    }
    return null;
  };
  
  const renderDays = () => {
    const days = [];
    // Blank days before the start of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(<div key={`blank-${i}`} className="border-r border-b"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      currentDate.setHours(0,0,0,0);
      
      const status = getDayStatus(currentDate);
      const isToday = currentDate.getTime() === today.getTime();
      
      const isStartDate = startDate && currentDate.getTime() === new Date(startDate).setHours(0,0,0,0);
      const isInRange = startDate && endDate && currentDate > startDate && currentDate <= endDate;
      
      let dayCellClasses = "border-r border-b h-16 flex justify-center items-center cursor-pointer transition-colors duration-200 ease-in-out";
      let dayNumberContainerClasses = "w-9 h-9 flex items-center justify-center text-sm";
      
      // Precedence: Status > Selection > Today
      if (status) {
        const statusStyle = statusStyles[status];
        if (statusStyle) {
          dayCellClasses += ` ${statusStyle.bg} font-medium`;
          dayNumberContainerClasses += ` ${statusStyle.text}`;
        }
      } else if (isStartDate || isInRange) {
         if (isStartDate) {
           dayNumberContainerClasses += ' bg-primary text-white rounded-full';
         }
         if (isInRange) {
           dayCellClasses += ' bg-primary-light';
           dayNumberContainerClasses += ' bg-primary text-white rounded-md';
         }
      } else {
        dayCellClasses += ' hover:bg-gray-100';
        if (isToday) {
          dayNumberContainerClasses += ' text-primary font-bold';
        }
      }

      days.push(
        <div key={day} className={dayCellClasses} onClick={() => onDateClick(currentDate)}>
          <div className={dayNumberContainerClasses}>{day}</div>
        </div>
      );
    }
    return days;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <button  title="Previous Month" onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-100">
          <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
        </button>
        <h3 className="text-lg font-semibold text-gray-800">
          {displayedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
        <button title="Next Month" onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-100">
          <ChevronRightIcon className="h-5 w-5 text-gray-600" />
        </button>
      </div>
      <div className="grid grid-cols-7 border-t border-l">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-xs font-medium text-gray-500 border-r border-b bg-gray-50">
            {day}
          </div>
        ))}
        {renderDays()}
      </div>
    </div>
  );
};

export default Calendar;
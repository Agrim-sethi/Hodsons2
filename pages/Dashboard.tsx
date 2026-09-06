import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import ModalHeader from '../components/ui/ModalHeader';
import { useToast } from '../components/ui/ToastProvider';
import { HOUSE_COLORS, IMAGES } from '../constants';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getEvents, Event, getSessions, saveSession, deleteSession, Session, getAttendance, saveAttendance, replaceAttendance, AttendanceRecord, InjuryRecord, getInjuries, saveInjury, deleteInjury, su[...]
export type TextVariablePreset = {
  key: string
  title: string
  value: string
}

export const textVariablePresets: TextVariablePreset[] = [
  { key: 'text_today_activity', title: "Today's Activity", value: 'Activity {{steps}} steps' },
  { key: 'text_weekly_progress', title: 'Weekly Progress', value: 'Week {{week}} progress' },
  { key: 'text_recovery_status', title: 'Recovery Status', value: 'Recovery {{bodyBattery}}%' },
  { key: 'text_training_readiness', title: 'Training Readiness', value: 'Ready {{bodyBattery}}%' },
  { key: 'text_battery_estimate', title: 'Battery Estimate', value: 'Battery {{battery}}%' },
  { key: 'text_weather_forecast', title: 'Weather Forecast', value: 'Weather AQI {{aqi}}' },
  { key: 'text_next_calendar', title: 'Next Calendar', value: 'Next reminder' },
  { key: 'text_sleep_summary', title: 'Sleep Summary', value: 'Sleep {{sleep}}' },
  { key: 'text_stress_level', title: 'Stress Level', value: 'Stress {{stress}}' },
  { key: 'text_heart_rate_zone', title: 'Heart Rate Zone', value: 'HR {{hr}} bpm' },
  { key: 'text_sunrise_sunset', title: 'Sunrise / Sunset', value: '{{sunrise}} / {{sunset}}' },
  { key: 'text_steps_remaining', title: 'Steps Remaining', value: 'Steps {{steps}}' },
  { key: 'text_move_reminder', title: 'Move Reminder', value: 'Move today' },
  { key: 'text_daily_goal', title: 'Daily Goal', value: 'Goal {{steps}}' },
  { key: 'text_device_status', title: 'Device Status', value: 'Battery {{battery}}%' },
]

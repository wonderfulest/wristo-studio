export type TextVariablePreset = {
  key: string
  title: string
  value: string
}

export const textVariablePresets: TextVariablePreset[] = [
  { key: 'text_today_activity', title: "Today's Activity", value: '"Activity " + (ai12) + " steps"' },
  { key: 'text_weekly_progress', title: 'Weekly Progress', value: '"Week " + (tm4) + " progress"' },
  { key: 'text_recovery_status', title: 'Recovery Status', value: '"Recovery " + (ds330) + "%"' },
  { key: 'text_training_readiness', title: 'Training Readiness', value: '"Ready " + (ds330) + "%"' },
  { key: 'text_battery_estimate', title: 'Battery Estimate', value: '"Battery " + (ds3) + "%"' },
  { key: 'text_weather_description', title: 'Weather Description', value: '(w02)' },
  { key: 'text_high_low_temperature', title: 'High / Low Temperature', value: '(w04) + "°/" + (w05) + "°"' },
  { key: 'text_next_calendar', title: 'Next Calendar', value: 'Next reminder' },
  { key: 'text_sleep_summary', title: 'Sleep Summary', value: 'Sleep summary' },
  { key: 'text_stress_level', title: 'Stress Level', value: '"Stress " + (ds331)' },
  { key: 'text_heart_rate_zone', title: 'Heart Rate Zone', value: '"HR " + (ds9) + " bpm"' },
  { key: 'text_sunrise_sunset', title: 'Sunrise / Sunset', value: '(as2) + " / " + (as2.1)' },
  { key: 'text_steps_remaining', title: 'Steps Remaining', value: '"Steps " + (ai12)' },
  { key: 'text_move_reminder', title: 'Move Reminder', value: 'Move today' },
  { key: 'text_daily_goal', title: 'Daily Goal', value: '"Goal " + (ai12)' },
  { key: 'text_device_status', title: 'Device Status', value: '"Battery " + (ds3) + "%"' },
]

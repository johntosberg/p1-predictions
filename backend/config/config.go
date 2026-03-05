package config

import (
	"fmt"
	"os"
	"time"

	"gopkg.in/yaml.v3"
)

type SeasonConfig struct {
	Season int          `yaml:"season"`
	Races  []RaceConfig `yaml:"races"`
}

type RaceConfig struct {
	Round    int    `yaml:"round"`
	Name     string `yaml:"name"`
	ShortName string `yaml:"short_name"`
	Circuit  string `yaml:"circuit"`
	Country  string `yaml:"country"`
	RaceDate string `yaml:"race_date"`
	LockTime string `yaml:"lock_time"`
	IsSprint bool   `yaml:"is_sprint"`
}

func (r *RaceConfig) ParseRaceDate() (time.Time, error) {
	return time.Parse(time.RFC3339, r.RaceDate)
}

func (r *RaceConfig) ParseLockTime() (time.Time, error) {
	return time.Parse(time.RFC3339, r.LockTime)
}

func LoadSeasonConfig(path string) (*SeasonConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read season config: %w", err)
	}

	var config SeasonConfig
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("parse season config: %w", err)
	}

	return &config, nil
}

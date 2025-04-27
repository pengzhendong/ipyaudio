// Copyright (c) Zhendong Peng
// Distributed under the terms of the Modified BSD License.

import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import { createElement } from './utils'

export function createRewardDropdown(language: string) {
  const rewardDropdown = createElement('div', 'dropdown my-3 float-end text-end')
  const dropdownButton = createElement('button', 'btn btn-warning dropdown-toggle')
  dropdownButton.setAttribute('data-bs-toggle', 'dropdown')
  dropdownButton.innerHTML =
    language === 'zh' ? '<i class="fa fa-thumbs-o-up"></i> 赞赏' : '<i class="fa fa-coffee"></i> Buy me a coffee'

  const dropdownMenu = createElement('ul', 'dropdown-menu p-2')
  const url = 'https://modelscope.cn/models/pengzhendong/pengzhendong/resolve/master/images'
  const rewards = [
    {
      imgSrc: `${url}/wechat-reward.jpg`,
      name: language === 'zh' ? '微信' : 'WeChat',
    },
    {
      imgSrc: `${url}/alipay-reward.jpg`,
      name: language === 'zh' ? '支付宝' : 'AliPay',
    },
  ]
  const table = createElement('table', 'table table-bordered mb-0')
  const tbody = createElement('tbody')
  const imageRow = createElement('tr')
  rewards.forEach((reward) => {
    const cell = createElement('td', 'text-center p-2')
    cell.style.width = `${100 / rewards.length}%`
    const img = createElement('img', 'img-fluid d-block mx-auto') as HTMLImageElement
    img.src = reward.imgSrc
    cell.appendChild(img)
    const name = createElement('div', 'text-center mt-2 fw-bold')
    name.textContent = reward.name
    cell.appendChild(name)
    imageRow.appendChild(cell)
  })
  tbody.appendChild(imageRow)
  table.appendChild(tbody)
  dropdownMenu.appendChild(table)

  const link = createElement('a') as HTMLAnchorElement
  link.href = 'https://github.com/pengzhendong/ipyaudio'
  link.target = '_blank'
  const starBadge = createElement('img', 'img-fluid me-3') as HTMLImageElement
  starBadge.src = 'https://img.shields.io/github/stars/pengzhendong/ipyaudio.svg'
  link.appendChild(starBadge)

  rewardDropdown.appendChild(link)
  rewardDropdown.appendChild(dropdownButton)
  rewardDropdown.appendChild(dropdownMenu)
  return rewardDropdown
}
